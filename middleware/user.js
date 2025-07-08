const { User } = require('../db/index');

async function isUser(req, res, next) {
    try{
        if(!req.user || !req.user.id){
            return res.status(400).json({message: "Unauthorized: No user info in token"});
        }
        const user = await User.findById(req.user.id);

        if(!user){
            return res.status(400).json({message:"User not found in data base"});
        }
        if(user.role !== 'user'){
            return res.status(400).json({message:"Access Denied:Users only"});
        }
        next();
    }catch(err){
        console.error("Isuser middleware error:",err);
        res.status(500).json({message: "Internal server error"
    });
}
}
module.exports = isUser