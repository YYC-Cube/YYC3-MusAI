FROM node:18-alpine

WORKDIR /app

# 安装构建工具和Python（sqlite3需要）
RUN apk add --no-cache python3 make g++

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 4000

# 启动应用
CMD ["npm", "start"]
