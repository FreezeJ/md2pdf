# Markdown to PDF Service

一个基于 Node.js 和 Playwright 的 Markdown 转 PDF 服务，提供 RESTful API 接口，支持将 Markdown 文档转换为高质量的 PDF 文件。

## 项目描述

Markdown to PDF Service 是一个轻量级的 Web 服务，专门用于将 Markdown 文档转换为 PDF 格式，并且提供下载地址。该服务具有以下特点：

- **高质量转换**：使用 Playwright 和 Chromium 渲染引擎，确保 PDF 输出质量
- **Markdown 增强**：支持目录生成、锚点链接、语法高亮等 Markdown 扩展功能
- **容器化部署**：提供完整的 Docker 支持，便于部署和扩展

### 效果截图

![1](./example/1.png)

### 主要功能

- Markdown 到 PDF 的实时转换
- 自动生成目录和章节锚点
- 代码语法高亮支持
- 临时下载链接管理

## 技术栈

- **运行时**：Node.js
- **Web 框架**：Express.js
- **Markdown 解析**：markdown-it
- **PDF 生成**：Playwright + Chromium
- **容器化**：Docker + Docker Compose

## 快速开始

#### 使用 Docker Compose

项目已提供完整的 `docker-compose.yml` 配置：

```bash
# 构建镜像并后台启动服务
docker-compose up -d --build

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

Docker Compose 配置说明：
- **服务端口**：3000（映射到容器内的 3000 端口）
- **认证令牌**：请手动修改，避免使用默认token
- **重启策略**：除非手动停止，否则自动重启
- **用户权限**：使用 pwuser 用户运行，提高安全性

## API 使用说明

### 转换 Markdown 到 PDF

**POST** `/render`

将 Markdown 文本转换为 PDF 文件。

**请求示例**：
```bash
curl --location --request POST 'http://127.0.0.1:3000/render' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer d5dea055ef9e849164435cf13a75152a' \
--data-raw '{"markdown": "# Hello\n## Hello"}'
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "PDF 生成成功",
  "data": {
    "downloadUrl": "http://127.0.0.1:3000/download/7619b8ba577cde42.pdf?token=bca0582c8fe9f432c2d4f29242838713",
    "expiresIn": 300
  }
}
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BEARER_TOKEN` | API 认证令牌 | `d5dea055ef9e849164435cf13a75152a` |

## 开发说明

### 项目结构

```
mcp-md2pdf/
├── src/                    # 源代码目录
│   ├── index.js           # 主服务文件 - Express 应用入口
│   ├── template.html      # PDF 模板文件 - HTML 模板
│   └── static/            # 静态资源目录
│       ├── a11y-light.min.css     # 代码高亮样式
│       ├── github-markdown.min.css # Markdown 样式
│       └── highlight.min.js       # 代码高亮脚本
├── test/                  # 测试目录
│   └── index.test.js      # 测试文件
├── example/               # 示例文件目录
│   ├── 1.md              # 示例 Markdown 文件
│   ├── 1.pdf             # 示例 PDF 输出文件
│   └── 1.png             # 项目效果截图
├── Dockerfile            # Docker 镜像构建文件
├── docker-compose.yml    # Docker Compose 配置
├── entrypoint.sh         # 容器入口脚本
├── package.json          # 项目依赖配置
├── .dockerignore         # Docker 忽略文件
└── .gitignore           # Git 忽略文件
```

### 自定义配置

- **Markdown 样式**：修改 `src/template.html` 来自定义 PDF 样式
- **认证令牌**：通过环境变量 `BEARER_TOKEN` 设置自定义令牌
- **端口映射**：在 `docker-compose.yml` 中修改端口映射

## 安全注意事项

1. **认证令牌**：在生产环境中务必修改默认的 `BEARER_TOKEN`
2. **文件大小限制**：服务限制 Markdown 文件大小为 50MB
3. **用户权限**：容器使用非 root 用户运行，提高安全性
4. **临时文件**：系统会自动清理过期的临时文件

## 故障排除

### 常见问题

1. **容器启动失败**
   - 检查端口 3000 是否被占用
   - 确认 Docker 服务正常运行

2. **PDF 转换失败**
   - 检查 Markdown 内容是否过大
   - 验证 Bearer Token 是否正确

3. **下载链接失效**
   - 下载链接有效期有限，请重新转换获取新链接


