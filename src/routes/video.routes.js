import { Router } from 'express';
import * as video from '../controllers/video.controller.js';
import { verifyJWT, optionalJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';
const router = Router();
router.get('/', video.getAllVideos);
router.get('/:videoId', optionalJWT, video.getVideoById);
router.use(verifyJWT);
router.post('/', upload.fields([{ name: 'videoFile', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), video.publishAVideo);
router.route('/:videoId').delete(video.deleteVideo).patch(upload.single('thumbnail'), video.updateVideo);
router.patch('/toggle/publish/:videoId', video.togglePublishStatus);
export default router;

