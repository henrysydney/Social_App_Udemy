const express = require('express');
const router = express.Router();

const auth = require('../../middleware/auth');
const { check, validationResult } = require("express-validator/check");

const Post = require('../../modules/Post');
const Profile = require('../../modules/Profile');
const User = require('../../modules/User');

// @route   POST api/posts
// @desc    POST Create a post
//@access   Private
router.post(
'/',
 [
     auth,
     [
         check('text', 'Text is required')
         .not()
         .isEmpty()
     ]
 ],
 async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById(req.user.id).select('-password');

        const newPost = new Post({
            text: req.body.text,
            name: user.name,
            avatar: user.avatar,
            user: req.user.id
        }); 

        const post = await newPost.save();

        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send({ msg: 'Server Error POST' });
    }

});

// @route   GET api/posts
// @desc    Get All posts
//@access   Private

router.get(
    '/',
    auth,
    async (req, res) => {
        try {
            const posts = await Post.find().sort({ date: -1});
            res.json(posts);                                      
        } catch (err) {
            console.error(err.message);
            res.status(500).send({ msg: 'Server Error POST' });
        }
    }
)

// @route   GET api/posts/:id
// @desc    Get posts by id
//@access   Private

router.get(
    '/:id',
    auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            if(!post){
                return res.status(404).json({ msg: 'Post not Found' });
            }
            

            res.json(post);                                      
        } catch (err) {
            console.error(err.message);
            if(err.kind === 'ObjectId'){
                return res.status(404).json({ msg: 'Post not Found' });
            }
            res.status(500).send({ msg: 'Server Error POST' });
        }
    }
)

// @route   DELETE api/posts/:id
// @desc    DELETE a post
//@access   Private

router.delete(
    '/:id',
    auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            if(!post){
                return res.status(404).json({ msg: 'Post not Found' });
            }
            // Check user
            if(post.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: 'User not authorised' });
            }

            await post.remove();
            
            res.json({ msg:'Post Removed'});                                      
        } catch (err) {
            console.error(err.message);
            if(err.kind === 'ObjectId'){
                return res.status(404).json({ msg: 'Post not Found' });
            }
            res.status(500).send({ msg: 'Server Error POST REMOVED' });
        }
    }
)

module.exports = router;