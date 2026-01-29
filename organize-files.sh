#!/bin/bash

# 文件整理脚本 - 将所有文件移到正确的目录

echo "🔧 开始整理文件结构..."

# 创建目录
mkdir -p config
mkdir -p controllers
mkdir -p middleware
mkdir -p routes
mkdir -p scripts
mkdir -p public/css
mkdir -p public/js
mkdir -p public/admin

# 移动 config 文件
[ -f db.js ] && mv db.js config/db.js && echo "✅ 移动 db.js 到 config/"

# 移动 controllers 文件
[ -f authController.js ] && mv authController.js controllers/authController.js && echo "✅ 移动 authController.js 到 controllers/"
[ -f dishController.js ] && mv dishController.js controllers/dishController.js && echo "✅ 移动 dishController.js 到 controllers/"
[ -f orderController.js ] && mv orderController.js controllers/orderController.js && echo "✅ 移动 orderController.js 到 controllers/"

# 移动 middleware 文件
[ -f "auth.js" ] && [ ! -d "auth.js" ] && mv auth.js middleware/auth.js && echo "✅ 移动 auth.js 到 middleware/"

# 移动 routes 文件
[ -f dishes.js ] && mv dishes.js routes/dishes.js && echo "✅ 移动 dishes.js 到 routes/"
[ -f orders.js ] && mv orders.js routes/orders.js && echo "✅ 移动 orders.js 到 routes/"
[ -f "auth (1).js" ] && mv "auth (1).js" routes/auth.js && echo "✅ 移动 auth.js 到 routes/"

# 移动 scripts 文件
[ -f init-db.js ] && mv init-db.js scripts/init-db.js && echo "✅ 移动 init-db.js 到 scripts/"
[ -f seed-data.js ] && mv seed-data.js scripts/seed-data.js && echo "✅ 移动 seed-data.js 到 scripts/"

# 移动 public 文件
[ -f index.html ] && mv index.html public/index.html && echo "✅ 移动 index.html 到 public/"
[ -f orders.html ] && mv orders.html public/admin/orders.html && echo "✅ 移动 orders.html 到 public/admin/"
[ -f style.css ] && mv style.css public/css/style.css && echo "✅ 移动 style.css 到 public/css/"

# 移动 js 文件
[ -f api.js ] && mv api.js public/js/api.js && echo "✅ 移动 api.js 到 public/js/"
[ -f app.js ] && mv app.js public/js/app.js && echo "✅ 移动 app.js 到 public/js/"
[ -f cart.js ] && mv cart.js public/js/cart.js && echo "✅ 移动 cart.js 到 public/js/"

echo ""
echo "✨ 文件整理完成！"
echo ""
echo "📂 新的目录结构："
echo "."
echo "├── config/"
echo "│   └── db.js"
echo "├── controllers/"
echo "│   ├── authController.js"
echo "│   ├── dishController.js"
echo "│   └── orderController.js"
echo "├── middleware/"
echo "│   └── auth.js"
echo "├── routes/"
echo "│   ├── auth.js"
echo "│   ├── dishes.js"
echo "│   └── orders.js"
echo "├── scripts/"
echo "│   ├── init-db.js"
echo "│   └── seed-data.js"
echo "├── public/"
echo "│   ├── index.html"
echo "│   ├── css/style.css"
echo "│   ├── js/"
echo "│   │   ├── api.js"
echo "│   │   ├── app.js"
echo "│   │   └── cart.js"
echo "│   └── admin/orders.html"
echo "├── server.js"
echo "├── package.json"
echo "├── .env"
echo "└── .gitignore"
echo ""
echo "🚀 现在可以运行："
echo "   npm install"
echo "   npm run init-db"
echo "   npm run seed"
echo "   npm start"
