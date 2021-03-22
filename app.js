require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 12;

app.use(express.urlencoded({extended:true}));
app.use(express.static("Public"));
app.set("view engine", "ejs");

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req,res)=>{
  res.render("home");
});
app.get("/login", (req,res)=>{
  res.render("login");
});
app.get("/register", (req,res)=>{
  res.render("register");
});


app.post("/register", (req, res)=>{

  bcrypt.hash(req.body.password, saltRounds, (err,hash)=>{
    const newUser = new User({
      email: req.body.email,
      password: hash,
    });
    newUser.save((err)=>{
      if(!err){
        console.log("new user added");
        res.render("secrets");
      } else {console.log(err);}
    });
  });
});

app.post("/login",(req, res)=>{
  User.findOne({email:req.body.email},(err, foundOne)=>{
    if(foundOne){
      bcrypt.compare(req.body.password, foundOne.password, (err, result)=>{
        if(result === true){
          res.render("secrets");
        } else {
          res.render("retry",{message: "Password is incorrect"});
        }
      });
    } else {
      res.render("retry",{message: "Email not found"});
    }
  });
});

app.listen(3000);
