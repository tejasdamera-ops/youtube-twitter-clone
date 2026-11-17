import { Router } from 'express';
import * as user from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT, optionalJWT } from '../middlewares/auth.middleware.js';
const router = Router();
router.post('/register', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), user.registerUser);
router.post('/login', user.loginUser);
router.post(['/refresh-token', '/refresh-Token'], user.refreshAccessToken);
router.get('/channel/:username', optionalJWT, user.getUserChannelDetails);
router.use(verifyJWT);
router.post('/logout', user.logoutUser);
router.post('/change-password', user.changeCurrentPassword);
router.route('/current-user').get(user.getCurrentUser).post(user.getCurrentUser);
router.patch('/update-user', user.updateAccountDetails);
router.patch('/update-avatar', upload.single('avatar'), user.updateAvatar);
router.patch('/update-coverImage', upload.single('coverImage'), user.updateUserCoverImage);
router.get(['/history', '/getChannelHistory'], user.getChannelHistory);
export default router;

