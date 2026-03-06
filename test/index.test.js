const request = require('supertest');
const { app, BEARER_TOKEN, server, cleanupInterval } = require('./index');

// 在所有测试结束后执行
afterAll((done) => {
  // 关闭定时器
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  // 如果服务器正在运行，则关闭它
  if (server && server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('POST /render', () => {
  // 设置更长的超时时间，因为 PDF 生成可能需要一些时间
  jest.setTimeout(30000); 

  it('应该成功渲染 Markdown 并返回 PDF 下载链接', async () => {
    const markdownContent = '# 测试标题\n\n这是一段测试用的 Markdown 文本。\n';

    const response = await request(app)
      .post('/render')
      .set('Authorization', `Bearer ${BEARER_TOKEN}`)
      .send({ markdown: markdownContent });

    // 1. 验证响应状态码
    expect(response.status).toBe(200);

    // 2. 验证响应体格式和内容
    expect(response.body).toHaveProperty('code', 0);
    expect(response.body).toHaveProperty('msg', 'PDF 生成成功');
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('downloadUrl');
    expect(response.body.data).toHaveProperty('expiresIn', 300);

    // 3. 验证返回的链接格式是否正确
    expect(response.body.data.filePath).toMatch(/\.pdf$/);
    expect(response.body.data.downloadUrl).toMatch(/\/download\/.*\.pdf\?token=.+/);
  });

  it('当没有提供 Token 时应该返回 401 未授权', async () => {
    const response = await request(app)
      .post('/render')
      .send({ markdown: '# test' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: 401, msg: '未授权：请求未提供 Token。', data: null });
  });

  it('当提供了无效的 Token 时应该返回 403 禁止访问', async () => {
    const response = await request(app)
      .post('/render')
      .set('Authorization', 'Bearer invalidtoken')
      .send({ markdown: '# test' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ code: 403, msg: '禁止访问：无效的 Token。', data: null });
  });

  it('当没有提供 Markdown 内容时应该返回 400 错误请求', async () => {
    const response = await request(app)
      .post('/render')
      .set('Authorization', `Bearer ${BEARER_TOKEN}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 400, msg: '请求体中必须包含 Markdown 内容。', data: null });
  });
});
