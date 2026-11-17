import mongoose from 'mongoose';
export const healthcheck = (req, res) => res.json({ success: true, data: { status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' } });


