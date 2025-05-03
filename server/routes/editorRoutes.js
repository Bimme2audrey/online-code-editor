const express = require('express');
const router = express.Router();
const { saveCode, loadCode } = require('../controllers/editorController');

router.post('/save', saveCode);
router.get('/load/:id', loadCode);

module.exports = router;