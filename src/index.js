const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const MarkdownIt = require('markdown-it');
const toc = require('markdown-it-toc-done-right');
const anchor = require('markdown-it-anchor');
const { chromium } = require('playwright');

// --- Express 应用设置 ---
const app = express();
// 用于解析 JSON 请求体的中间件，已提高限制以处理更大的 Markdown 文件
app.use(express.json({ limit: '50mb' }));

// --- 身份认证设置 ---
// 从环境变量读取 BEARER_TOKEN，如果没有则使用默认值
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'd5dea055ef9e849164435cf13a75152a';

// 用于存储临时下载 Token 的 Map (key: token, value: { fileName, expires })
const downloadTokens = new Map();

// Bearer Token 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // 从 "Bearer <token>" 中提取 Token

  if (!token) {
    return res.status(401).json({ code: 401, msg: '未授权：请求未提供 Token。' , data: null });
  }

  if (token !== BEARER_TOKEN) {
    return res.status(403).json({ code: 403, msg: '禁止访问：无效的 Token。' , data: null });
  }

  next(); // Token 有效，继续处理下一个中间件或路由
};

// 清理过期 Token 的定时器 (每分钟清理一次)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, data] of downloadTokens.entries()) {
    if (now > data.expires) {
      downloadTokens.delete(token);
    }
  }
}, 60000);

// --- Markdown-it 设置 (可重用) ---
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
})
  .use(anchor, {
    // 为标题添加锚点
    level: [1, 2, 3],
    slugify: s =>
      encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-')),
  })
  .use(toc, {
    // 配置目录级别
    level: [1, 2, 3],
    slugify: s =>
      encodeURIComponent(String(s).trim().toLowerCase().replace(/\s+/g, '-')),
  });

// --- 核心 PDF 生成逻辑 ---
async function generatePdfFromMarkdown(markdownContent) {
  const rendered = md.render(markdownContent);
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
  const fullHtml = template.replace('{{content}}', rendered);

  // 生成唯一文件名以避免冲突
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const htmlFileName = `${uniqueId}.html`;
  const pdfFileName = `${uniqueId}.pdf`;
  const htmlPath = path.resolve(__dirname, htmlFileName);
  const pdfPath = path.join(__dirname, 'download', pdfFileName);

  // 写入临时 HTML 文件
  fs.writeFileSync(htmlPath, fullHtml);

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // 关键：避免 /dev/shm 容量不足导致崩溃
    ],
  });
  const page = await browser.newPage();

  // 跳转到本地 HTML 文件，确保外部资源可以加载
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });

  // 等待 JS 高亮执行完毕 (如果存在)
  await page.waitForTimeout(300);

  // 生成 PDF
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    timeout: 120000, // 设置超时为 2 分钟
  });

  await browser.close();

  // 清理临时 HTML 文件
  fs.unlinkSync(htmlPath);

  // 返回生成 PDF 的文件名和绝对路径
  return { fileName: pdfFileName, filePath: pdfPath };
}

// --- API 接口 ---
app.post('/render', authenticateToken, async (req, res) => {
  const { markdown } = req.body;

  if (!markdown) {
    return res.status(400).json({ code: 400, msg: '请求体中必须包含 Markdown 内容。' , data: null });
  }

  try {
    const { fileName, filePath } = await generatePdfFromMarkdown(markdown);
    
    // 为下载生成临时的 32 位 Token
    const tempToken = crypto.randomBytes(16).toString('hex');
    const expires = Date.now() + 300 * 1000; // 300秒后过期
    
    // 存储 Token 信息
    downloadTokens.set(tempToken, { fileName, expires });
    
    // 获取协议和主机名，用于构建下载链接 (包含 token 参数)
    const protocol = req.protocol;
    const host = req.get('host');
    const downloadUrl = `${protocol}://${host}/download/${fileName}?token=${tempToken}`;

    res.status(200).json({ 
      code: 0, 
      msg: 'PDF 生成成功', 
      data: { 
        // filePath, 
        downloadUrl,
        expiresIn: 300
      } 
    });
  } catch (error) {
    console.error('生成 PDF 失败:', error);
    res.status(500).json({ code: 500, msg: '生成 PDF 时发生内部服务器错误。' , data: null });
  }
});

// 文件下载接口 (使用 URL 参数 token 校验，不再需要 Bearer Token)
app.get('/download/:filename', (req, res) => {
  const fileName = req.params.filename;
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ code: 401, msg: '下载失败：未提供下载 Token。', data: null });
  }

  const tokenData = downloadTokens.get(token);

  // 校验 Token 是否存在、文件名是否匹配以及是否过期
  if (!tokenData || tokenData.fileName !== fileName) {
    return res.status(403).json({ code: 403, msg: '下载失败：无效的 Token。', data: null });
  }

  if (Date.now() > tokenData.expires) {
    downloadTokens.delete(token); // 清理过期的 Token
    return res.status(403).json({ code: 403, msg: '下载失败：下载链接已过期。', data: null });
  }

  const filePath = path.join(__dirname, 'download', fileName);

  // 检查文件是否存在
  if (fs.existsSync(filePath)) {
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('文件下载失败:', err);
        if (!res.headersSent) {
          res.status(500).json({ code: 500, msg: '文件下载失败', data: null });
        }
      }
    });
  } else {
    res.status(404).json({ code: 404, msg: '文件不存在', data: null });
  }
});

// --- 启动服务器 ---
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

let server;
// 仅在直接运行时启动服务器
if (require.main === module) {
  server = app.listen(PORT, HOST, () => {
    console.log(`服务器正在运行，监听地址为 http://${HOST}:${PORT}`);
    console.log(`Bearer Token: ${BEARER_TOKEN}`);
  });
}

// --- 导出模块以供测试 ---
module.exports = { app, BEARER_TOKEN, server, cleanupInterval };
