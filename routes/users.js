const express = require('express');
const router = express.Router();
const { getAllUsers, getUserDetail, deleteUser } = require('../controllers/userController');

// 管理员路由
router.get('/admin/all', getAllUsers);
router.get('/admin/:id', getUserDetail);
router.delete('/admin/:id', deleteUser);

module.exports = router;
