const express = require('express')
const app = express()
const port = 7782

const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const { User } = require('./models/User')
const config = require('./config/key')
const {auth} = require("./middleware/auth");


//application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}));
//applicaton/json
app.use(bodyParser.json());
app.use(cookieParser());


mongoose.connect(config.mongoURI)
    .then(() => console.log("mongodb connect"))
    .catch(reportError => console.log(reportError))

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/api/users/register', (req, res) => {
    // 회원가입할때 필요한정보들을 화면(client)에서 가져와 db에 넣는다
    const user = new User(req.body)

    user.save((err, userInfo) => {
        if(err) return res.json({success: false, err})
        return res.status(200).json({
            success: true
        })
    })
})

app.post('/api/users/login', (req, res) => {
    //요청된 이메일을 데이터베이스에서 찾는다
    User.findOne({email: req.body.email}, (err, user) => {
        if(!user) {
            return res.json({
                loginSuccess: false,
                message: "제공된 이메일에 해당하는 유저가 없습니다."
            })
        }

        //요청된 이메일이 디비에있는 비번이 맞는지 확인
        user.comparePassword(req.body.password, (err, isMatch) => {
            if(!isMatch)
                return res.json({loginSuccess: false, message: "비밀번호가 틀렸습니다."})
            //비밀번호 맞으면 토큰생성
            user.generateToken((err, user) => {
                if(err) return res.status(400).send(err);

                // 토큰을 저장한다. 어디에? 쿠키, 로컬스토리지,
                res.cookie("x_auth", user.token)
                    .status(200)
                    .json({loginSuccess: true, userId: user._id, token: user.token})
            })
        })
    })
})

// role 1 어드민 role 2 특정 부서 어드민
// role 0 -> 일반유저 role 0이 아니면 관리자
app.post('/api/users/auth', auth, (req, res) => {
    // Authentication = true
    res.status(200).json({
        _id: req.user._id,
        isAdmin: req.user.role === 0 ? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image
    })
})

app.get('/api/users/auth', auth, (req, res) => {
    res.status(200).json({
        _id: req.user._id,
        isAdmin: req.user.role === 0 ? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image,
    });
});

app.get('/api/users/logout', auth, (req, res) => {
    User.findOneAndUpdate({_id: req.user._id},
        {token: ""}, (err, user)=> {
        if(err) return res.json({success: false, err});
        return res.status(200).send({
            success: true
        })
    })
})

app.get('/api/hello', (req, res) => {
    res.send("안녕")
})
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})