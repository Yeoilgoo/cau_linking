var express  = require("express");
var router   = express.Router();
var Post     = require("../models/Post");
var User     = require("../models/User");
var async    = require('async');
var util     = require("../util");

// Index
router.get("/", function(req, res){
  Post.find({})
  .populate("author")
  .sort("-createdAt")
  .exec(function(err, posts){
    if(err) return res.json(err);
    res.render("posts/index", {posts:posts});
  });
});

// search

router.get('/search', function(req, res){
    var search_word = req.param('searchWord');
    var search_category = req.param('searchCategory');
    var searchCondition = {$regex:search_word};


    if(search_category == "author") {
      User.find({username:searchCondition}).exec(function(err, user){
        if(err) throw err;
        Post.find({author:user}).populate("author").sort("-createdAt").exec(function(err, posts){
            if(err) throw err;
            console.log(posts);
            res.render('posts/index', {posts:posts});
        });
      });
    }
    else {
      Post.find({$or:[{title:searchCondition},{body:searchCondition}]}).populate("author").sort("-createdAt").exec(function(err, posts){
        if(err) throw err;
        console.log(posts);
        res.render('posts/index', {posts:posts});
    });
  }
});


// New
router.get("/new", util.isLoggedin, function(req, res){
  var post = req.flash("post")[0] || {};
  var errors = req.flash("errors")[0] || {};
  res.render("posts/new", { post:post, errors:errors });
});

// create
router.post("/", util.isLoggedin, function(req, res){
  req.body.author = req.user._id;
  Post.create(req.body, function(err, post){
    if(err){
      req.flash("post", req.body);
      req.flash("errors", util.parseError(err));
      return res.redirect("/posts/new");
    }
    res.redirect("/posts");
  });
});

// show
router.get("/:id", function(req, res){
  Post.findOne({_id:req.params.id})
  .populate("author")
  .exec(function(err, post){
    if(err) return res.json(err);
    res.render("posts/show", {post:post});
  });
});

// edit
router.get("/:id/edit", util.isLoggedin, checkPermission, function(req, res){
  var post = req.flash("post")[0];
  var errors = req.flash("errors")[0] || {};
  if(!post){
    Post.findOne({_id:req.params.id}, function(err, post){
      if(err) return res.json(err);
      res.render("posts/edit", { post:post, errors:errors });
    });
  } else {
    post._id = req.params.id;
    res.render("posts/edit", { post:post, errors:errors });
  }
});

// update
router.put("/:id", util.isLoggedin, checkPermission, function(req, res){
  req.body.updatedAt = Date.now();
  Post.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post){
    if(err){
      req.flash("post", req.body);
      req.flash("errors", util.parseError(err));
      return res.redirect("/posts/"+req.params.id+"/edit");
    }
    res.redirect("/posts/"+req.params.id);
  });
});

// destroy
router.delete("/:id", util.isLoggedin, checkPermission, function(req, res){
  Post.remove({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect("/posts");
  });
});


module.exports = router;
// private functions
function checkPermission(req, res, next){
  Post.findOne({_id:req.params.id}, function(err, post){
    if(err) return res.json(err);
    if(post.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}
