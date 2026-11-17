import { Router } from 'express';
import * as comment from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router = Router();
router.get('/:videoId', comment.getVideoComments);
router.post('/:videoId', verifyJWT, comment.addComment);
router.route('/c/:commentId').delete(verifyJWT, comment.deleteComment).patch(verifyJWT, comment.updateComment);
export default router;

