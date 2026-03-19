#!/bin/bash

mkdir -p download # 创建下载目录
chown -R 2048:109 download  # 2048:109 是容器 pwuser 用户的 UID 和 GID

# 命令处理逻辑
case "$1" in
    build)
        echo "正在构建镜像..."
        docker compose build
        ;;
    stop)
        echo "正在停止服务..."
        docker compose down
        ;;
    start)
        echo "正在重新构建并启动服务..."
        docker compose up -d
        ;;
    restart)
        echo "正在重新构建并启动服务..."
        docker compose down && docker compose up -d --build
        ;;
    *)
        echo "用法: $0 {build|stop|start}"
        echo "  build: 构建 Docker 镜像"
        echo "  stop:  停止并移除 Docker 容器"
        echo "  start: 启动服务 (重新构建并后台运行)"
        echo "  restart: 重启服务 (移除后重新构建并后台运行)"
        exit 1
        ;;
esac
