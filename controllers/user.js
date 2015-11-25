var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
var User = require('../models/User');
var Team = require('../models/Team');
var TeamMember = require('../models/TeamMember');
var Order = require('../models/Order');
var secrets = require('../config/secrets');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = function(req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      req.flash('errors', { msg: info.message });
      return res.redirect('/login');
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Success! You are logged in.' });
      // res.redirect(req.session.returnTo || '/'); // Session Bit is actin funny--mark does not understand how it works.
      res.redirect('/dashboard');
    });
  })(req, res, next);
};

/**
 * GET /userDashboard
 */
exports.index = function(req, res) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    res.render('account/dashboard', {
      title: 'Dashboard',
      name:user.firstname,
    });
  });
};

/**
 * GET /teams
 */
exports.getTeams = function(req, res) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    res.render('account/teams', {
      title: 'Teams',
    });
  });
};

/**
 * GET /createteam
 */
exports.getCreateTeam = function(req, res) {
  res.render('account/createteam', {
    title: 'CreateATeam',
  });
};

/**
 * POST /Create a Team
 * Create a new team
 */
exports.postCreateTeam = function(req, res, next) {

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    //Create a Team Object with the teamMemberFName
    var team=new Team({
      teamname: req.body.teamname,
    });

    //Get the teamsize from the post request
    var teamsizeinput = req.body.teamsize;
    var teamArray = [];

    //For the size of the team create a team member object for each team member
    for (i = 0; i < teamsizeinput; i++){
      var fnameString="teamMemberFName"+(i+2);
      var lnameString="teamMemberLName"+(i+2);
      var emailString="teamMemberEmail"+(i+2);

      var teammember=new TeamMember({
        firstname: req["body"][fnameString],
        lastname: req["body"][lnameString],
        email: req["body"][emailString],
        initials:req["body"][fnameString].charAt(0)+req["body"][lnameString].charAt(0)
      });
      teamArray.push(teammember);
      // console.log("Created New Team Member! " + teammember);
    }
    team.members=teamArray;

    user.teams.push(team);

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Team saved' });
      if(user.orders.length<=0){
      res.redirect('/teams/'+req.body.teamname+"/orderdetails");
      }
      else{
      res.redirect('/teams/');
      }
    });
  });
};

/**
 * GET /:teamname/orderdetails
 */
exports.OrderDetails = function(req, res) {
  User.findById(req.user.id, function(err, user) {
    var teamid;
    for(i=0; i<req.user.teams.length; i++){
      if(req.user.teams[i].teamname==req.name){
        teamid=i;
      }
    }
    // stripe = require('stripe')(secrets.stripe.secretKey);
    res.render('account/orderdetails', {
      title:"OrderDetails",
      teamname:req.user.teams[teamid].teamname,
      teammembers:req.user.teams[teamid].members,
      // publishableKey: secrets.stripe.publishableKey
    });
  });
};

/**
 * POST /Create a Team
 * Create a new team
 */
exports.postReviewandPay = function(req, res, next) {
  // res.send(req.body)
  // console.log(req.body.teamMemberFName[2]);
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    //Create a Team Object
    var teamOrder=new Team({
      teamname: req.body.teamname,
    });

    //Get the teamsize from the post request
    var teamsizeinput = req.body.orderteamsize;
    var teamArray = [];

    //For the size of the team create a team member object for each team member
    for (i = 0; i < teamsizeinput; i++){
      var teammember=new TeamMember({
        firstname: req.body.teamMemberFName[i],
        lastname: req.body.teamMemberLName[i],
        email: req.body.teamMemberEmail[i],
        initials:req.body.teamMemberFName[i].charAt(0)+req.body.teamMemberLName[i].charAt(0)
      });
      //Add the teammember to the array of team members
      teamArray.push(teammember);
      // console.log("Created New Team Member! " + teammember);
    }
    //Add the array to the Team Object under the "team" property
    teamOrder.members=teamArray;

    //Create a new Order Object
    var newOrder= new Order({
      orderteamsize:req.body.orderteamsize,
      dateplaced:Date(),
      orderfordate:req.body.orderfordate,
      totalcost:req.body.totalcost,
      deliverytime: req.body.deliverytime,
      teamMinimum: req.body.minteamsize,
      defaultfoodmood: String,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
      postalcode: req.body.postalcode,
      defaultfoodmood:req.body.defaultfoodmood,
      team:teamOrder
    })

    user.orders.push(newOrder);

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'order Created' });
      res.redirect('/dashboard');
    });

  });
};


/**
 * GET /logout
 * Log out.
 */
exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/signup', {
    title: 'Create Account'
  });
};


/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = function(req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
  req.assert('userfirstname', 'Missing First Name').len(2);
  req.assert('userlastname', 'Missing Last Name').len(3);
  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  var user = new User({
    email: req.body.email,
    password: req.body.password,
    profile:{
    firstname: req.body.userfirstname,
    lastname: req.body.userlastname
    }
  });

  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (existingUser) {
      req.flash('errors', { msg: 'Account with that email address already exists.' });
      return res.redirect('/signup');
    }
    user.save(function(err) {
      if (err) return next(err);
      req.logIn(user, function(err) {
        if (err) return next(err);
        res.redirect('/dashboard');
      });
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = function(req, res) {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    user.email = req.body.email || '';
    user.profile.name = req.body.name || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.password = req.body.password;

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    if (err) return next(err);
    req.logout();
    req.flash('info', { msg: 'Your account has been deleted.' });
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = function(req, res, next) {
  var provider = req.params.provider;
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user[provider] = undefined;
    user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

    user.save(function(err) {
      if (err) return next(err);
      req.flash('info', { msg: provider + ' account has been unlinked.' });
      res.redirect('/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  User
    .findOne({ resetPasswordToken: req.params.token })
    .where('resetPasswordExpires').gt(Date.now())
    .exec(function(err, user) {
      if (!user) {
        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
        return res.redirect('/forgot');
      }
      res.render('account/reset', {
        title: 'Password Reset'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = function(req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  async.waterfall([
    function(done) {
      User
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .exec(function(err, user) {
          if (!user) {
            req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
            return res.redirect('back');
          }

          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

          user.save(function(err) {
            if (err) return next(err);
            req.logIn(user, function(err) {
              done(err, user);
            });
          });
        });
    },
    function(user, done) {
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'team@gatherround.io',
        subject: 'Your Gather Round password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('success', { msg: 'Success! Your password has been changed.' });
        done(err);
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/');
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = function(req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  async.waterfall([
    function(done) {
      crypto.randomBytes(16, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
        if (!user) {
          req.flash('errors', { msg: 'No account with that email address exists.' });
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: secrets.sendgrid.user,
          pass: secrets.sendgrid.password
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'team@gatherround.io',
        subject: 'Reset your password on GatherRound.io',
        text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      transporter.sendMail(mailOptions, function(err) {
        req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
};
