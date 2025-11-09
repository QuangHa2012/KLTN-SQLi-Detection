# Sử dụng Node.js 18 trên Alpine để nhẹ
FROM node:18-alpine

# Đặt thư mục làm việc
WORKDIR /usr/src/app

# Copy package.json và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ source
COPY . .

# Cổng Node app
EXPOSE 3000

# Chờ SQL Server sẵn sàng
CMD sh -c "sleep 30 && npm start"
