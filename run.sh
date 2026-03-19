#!/bin/bash

# 获取脚本所在的目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 命令处理逻辑
case "$1" in
    build)
        echo "正在构建镜像..."
        docker-compose build
        ;;
    stop)
        echo "正在停止服务..."
        docker-compose down
        ;;
    start)
        echo "正在启动服务..."
        docker-compose up -d --build
        ;;
    *)
        echo "用法: $0 {build|stop|start}"
        exit 1
        ;;
esac
