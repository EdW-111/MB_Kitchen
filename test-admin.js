const http = require('http');

// 测试管理员登陆
async function testAdminLogin() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      username: 'mkchufang',
      password: 'zhengdaqian'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ 管理员登陆测试:', response.success ? '成功' : '失败');
          console.log('   响应:', response);
          resolve(response.success);
        } catch (e) {
          console.log('❌ 管理员登陆测试失败:', e.message);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// 测试错误凭证
async function testInvalidLogin() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'wrong'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ 错误凭证测试:', response.success === false ? '成功（正确拒绝）' : '失败');
          resolve(!response.success);
        } catch (e) {
          console.log('❌ 错误凭证测试失败:', e.message);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// 测试检查认证
async function testCheckAuth() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/admin/check',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ 检查认证测试:', !response.success ? '成功（未登陆）' : '失败');
          resolve(!response.success);
        } catch (e) {
          console.log('❌ 检查认证测试失败:', e.message);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('❌ 请求失败:', e.message);
      resolve(false);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 开始测试管理员功能...\n');
  await testAdminLogin();
  await testInvalidLogin();
  await testCheckAuth();
  console.log('\n✨ 测试完成！');
  process.exit(0);
}

// 等待服务器启动
setTimeout(runTests, 2000);
