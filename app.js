//jshint esversion:6
const bodyparser = require("body-parser");
const express = require('express');
const ejs = require("ejs");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const connectDB = require('./server/connection');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.use(bodyparser.urlencoded({extended:true}));

dotenv.config({path:'config.env'}); 
const PORT = process.env.PORT||8080 



app.set('view engine','ejs');
app.use(express.static("public"));

app.use(session({
    secret: "keyboard sexcrett cat",
    resave: false,
    saveUninitialized: true,
   
  }));

app.use(passport.initialize());
app.use(passport.session());



  connectDB();


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = new mongoose.model("USER", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
   
  passport.deserializeUser(function(user, done) {
      
        done(null, user);
     
    
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    useProfileUrl:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id, username: profile.displayName }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate('google', { scope: ["profile"] })

);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, founduser){
        if(err){
            console.log(err);
        }else{
            if(founduser){
                res.render("secrets", {userWithSecret: founduser});
            }
        }
    });
    
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.get("/signout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/submit", function(req, res){
    const subsecret = req.body.secret;
    console.log(req.user._id);
      User.findById(req.user._id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = subsecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });  
   
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        }
        
    })    

    
});

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        }
    });
})

app.listen(PORT,()=>{console.log(`server is running ${PORT}`)});
