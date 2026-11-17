import { Router } from 'express';
import * as subscription from '../controllers/subscription.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router = Router();
router.use(verifyJWT);
router.route('/c/:channelId').get(subscription.getUserChannelSubscribers).post(subscription.toggleSubscription);
router.get('/u/:subscriberId', subscription.getSubscribedChannels);
export default router;

