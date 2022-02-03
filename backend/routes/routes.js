const router = require('express').Router()
const express = require('express')
const songController = require('../controllers/song-controller.js')
const userController = require('../controllers/user-controller.js')
const passport = require('passport')

router.get('/', (req, res) => {
    res.send("Test Home for Backend");
});

router.post('/register', userController.registerUser)
router.post('/login', userController.loginUser)

// Using middleware authentication, first argument is the strategy (JWT)
router.get('/app', passport.authenticate('jwt', {session: false}), (req, res) => {
    return res.json({ message: `Hello ${req.user.email}`})
})

router.get('/song', passport.authenticate('jwt', {session: false}), songController.get_audio)

module.exports = router