# 使用 mcp/mcp-playwright 作为基础镜像
FROM playwright/chrome:latest

# 切换到 root 用户来设置 entrypoint.sh 的权限
USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh


# 设置工作目录
WORKDIR /home/pwuser

# 先复制 package.json 以便利用缓存
COPY package*.json ./

# 安装依赖并清理 npm 缓存以减小镜像体积
RUN npm config set registry https://registry.npmmirror.com && npm install --omit=dev && \
    npm cache clean --force

# 然后复制项目其他文件到工作目录
COPY . .

# 修改文件权限为 pwuser 组
RUN chown -R pwuser:pwuser /home/pwuser

USER pwuser

# 暴露服务端口
EXPOSE 3000

# 使用基础镜像的entrypoint.sh，并直接运行 npm start
ENTRYPOINT ["/entrypoint.sh"]