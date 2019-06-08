const express = require("express");
const request = require('request');
const config = require('config');
const router = express.Router();
const { check, validationResult } = require("express-validator/check");

const auth = require("../../middleware/auth");
const Profile = require("../../modules/Profile");
const User = require("../../modules/User");

// @route   GET api/profile/me
// @desc    Get current users profile
// @access  Private

//adding auth to any route that we want to protect
router.get("/me", auth, async (req, res) => {
  try {
    //user (link to mongoose.Schema.Types.ObjectId in Profile) is set to req.user.id
    const profile = await Profile.findOne({ user: req.user.id }).populate(
      "user",
      ["name", "avatar"]
    );

    if (!profile) {
      return res.status(400).json({ msg: "There is no profile for this user" });
    }

    res.json(profile);
  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error PROFILE");
  }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private

router.post(
  "/",
  [
    auth,
    // Validation for status and skills
    [
      check("status", "Status is required")
        .not()
        .isEmpty(),
      check("skills", "Skills is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    // If there is erros
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;

    // Build Profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;

    if (skills) {
      profileFields.skills = skills.split(",").map(skill => skill.trim(""));
    }

    // Build social object
    profileFields.social = {};
    if (youtube) profileFields.social.youtube = youtube;
    if (facebook) profileFields.social.facebook = facebook;
    if (twitter) profileFields.social.twitter = twitter;
    if (instagram) profileFields.social.instagram = instagram;
    if (linkedin) profileFields.social.linkedin = linkedin;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      // If there is a profile, then update
      if (profile) {
        // update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      // Create if profile not found
      profile = new Profile(profileFields);

      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error Profile BUILD");
    }
  }
);

// @route   GET api/profile
// @desc    Get all profiles
// @access  Public
router.get("/", async (req, res) => {
  try {
    // All profiles
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);

    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error GET ALL PROFILE");
  }
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public

router.get("/user/:user_id", async (req, res) => {
  try {
    // All profiles
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]);

    if (!profile) return res.status(400).json({ msg: "Profile Not Found" });

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == "ObjectId") {
      return res.status(400).json({ msg: "Profile Not Found" });
    }
    res.status(500).send("Server Error GET PROFILE");
  }
});

// @route   DELETE api/profile
// @desc    DELETE profile, user & posts
// @access  Private
router.delete("/", auth, async (req, res) => {
  try {
    // @todo - remove user posts

    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });

    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });
    res.json({ msg: "User deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error GET ALL PROFILE");
  }
});

// @route   PUT api/profile/experience
// @desc    PUT profile experience
// @access  Private
router.put(
  "/experience",
  [
    auth,
    // Validation
    [
      check("title", "Title is required")
        .not()
        .isEmpty(),
      check("company", "Company is required")
        .not()
        .isEmpty(),
      check("from", "From Date is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    // If there is erros
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body;

    // // Build experience
    // const newExp = {
    //   title,
    //   company,
    //   location,
    //   from,
    //   to,
    //   current,
    //   description
    // };

    const newExp = {};
    newExp.user = req.user.id;
    newExp.experience = {};
    if (title) newExp.experience.title = title;
    if (company) newExp.experience.company = company;
    if (location) newExp.experience.location = location;
    if (from) newExp.experience.from = from;
    if (to) newExp.experience.to = to;
    if (current) newExp.experience.current = current;
    if (description) newExp.experience.description = description;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      // If there is a profile, then update
      if (profile) {
        // update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: newExp },
          { new: true }
        );

        return res.json(profile);
      }

      profile.experience.unshift(newExp);
      // Create if profile not found
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error EXPERIENCE");
    }
  }
);

// @route   DELETE api/profile/experience
// @desc    DELETE profile experience
// @access  Private
router.delete("/experience/:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // Get remove index
    const removeIndex = profile.experience
      .map(item => item.id)
      .indexOf(req.params.exp_id);

    profile.experience.splice(removeIndex, 1);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error DELETE EXP");
  }
});

// @route   PUT api/profile/education
// @desc    PUT profile education
// @access  Private
router.put(
  "/education",
  [
    auth,
    // Validation
    [
      check("school", "Title is required")
        .not()
        .isEmpty(),
      check("degree", "Company is required")
        .not()
        .isEmpty(),
      check("fieldofstudy", "fieldofstudy is required")
        .not()
        .isEmpty(),
      check("from", "from is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    // If there is erros
    if (!errors.isEmpty()) {
      return res.status(400).json({ erros: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    } = req.body;

    const newEdu = {};
    newEdu.user = req.user.id;
    newEdu.education = {};
    if (school) newEdu.education.school = school;
    if (degree) newEdu.education.degree = degree;
    if (fieldofstudy) newEdu.education.fieldofstudy = fieldofstudy;
    if (from) newEdu.education.from = from;
    if (to) newEdu.education.to = to;
    if (current) newEdu.education.current = current;
    if (description) newEdu.education.description = description;

    try {
      let profile = await Profile.findOne({ user: req.user.id });

      // If there is a profile, then update
      if (profile) {
        // update
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: newEdu },
          { new: true }
        );

        return res.json(profile);
      }

      profile.experience.unshift(newEdu);
      // Create if profile not found
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error EDUCATION");
    }
  }
);

// @route   DELETE api/profile/education
// @desc    DELETE profile education
// @access  Private
router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    // Get remove index
    const removeIndex = profile.education
      .map(item => item.id)
      .indexOf(req.params.edu_id);

    profile.education.splice(removeIndex, 1);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error DELETE EDUCATION");
  }
});

// @route   GET api/profile/github/:username
// @desc    GET user repos from Github
// @access  Public

router.get('/github/:username', (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${req.params.username}/repo?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' }
    };

    request(options, (error, response, body) => {
      if(error) console.error(error);

      if(response.statusCode !== 200) {
        return res.status(404).json({ msg: 'No GitHub profile found' });
      }

      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error GITHUB');
  }

});

//export the route
module.exports = router;
