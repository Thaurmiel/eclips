// Setup basic express server
const { Console } = require('console');
const express = require('express');
const { SocketAddress } = require('net');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  console.log("Got res")
  res.sendFile(__dirname + '/public/index.html');
});



// database imitation
let users =[]
let groups =[];


const max_rooms = 15;
let avaiable_room_count = max_rooms  - groups.length
const MAX_LENGTH = 45
const MIN_LENGTH = 35



function randomValue(min = 1000000,max = 9999999){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function callNextUser(targetGroup){
  console.log()
  //console.log("Turn now:",targetGroup.game.roleTurn) // 3 2 1
let place = targetGroup.game.roleTurn
let nextRole = targetGroup.game.roles.find((x)=>{
  return x.place == place
})
if(nextRole){
  let data = getChainData(targetGroup)
  
  console.log("Turn opened to",getActiveUserId(targetGroup), targetGroup.game.roleTurn)
  io.to(getActiveUserId(targetGroup)).emit('turn opened')
  io.to(targetGroup.id).emit('update game',data)
} 
else console.log("Wrong user call")

}
function callNextTurn(group)
{
  if(group.game.turn<=group.game.lastTurn && group.game.gameStarted)
  {

    let turnEndProtocol = {
      factoryEnd:{
        products:group.game.Rupnica.products
      },
      role1End:{
        place:group.game.roles[0].place,
        products:group.game.roles[0].products
      },
      role2End:{
        place:group.game.roles[1].place,
        products:group.game.roles[1].products
      },
      role3End:{
        place:group.game.roles[2].place,
        products:group.game.roles[2].products
      }
    }
    // game data
    let submitTurnLog = Object.assign(group.game.turnLog,turnEndProtocol)
    console.log()
    console.log("Turn log",submitTurnLog)
    group.game.gameLog.push(deepCopy(submitTurnLog)) // to avoid shadow copy
    io.to(group.id).emit('update statistics',submitTurnLog )
    group.game.turnLog = {}
    // new demand

    // GAME LOGIC

    group.game.turn++
    group.game.roleTurn = 3
    
    group.game.turnDemand = group.game.getDemand()
    group.game.movePackages()

    //console.log("After demand call",group.game.turnDemand)

    let turnStartProtocol = {
      turn:group.game.turn,
      demand:group.game.turnDemand,
      factory:{
        products:group.game.Rupnica.products
      },
      role1:{
        place:group.game.roles[0].place,
        products:group.game.roles[0].products
      },
      role2:{
        place:group.game.roles[1].place,
        products:group.game.roles[1].products
      },
      role3:{
        place:group.game.roles[2].place,
        products:group.game.roles[2].products
      }
    }
    group.game.turnLog = deepCopy(turnStartProtocol) // no shadow copies

    group.game.applyDemand() 
    let data = getChainData(group)
    io.to(group.id).emit('update game',data)

    callNextUser(group)
  }
  else{
    console.log("Game end", group.id )
    group.game.gameStarted = false
    io.to(group.id).emit('game end',group.game.gameLog)
    io.in(group.id).socketsJoin('start room');
    io.in(group.id).socketsLeave(group.id);
    
  }

}

function deepCopy(data){
  return JSON.parse(JSON.stringify(data));
}
function applyPackage(targetGroup,role,acceptedPackage) // also changes turns
{
 

  if(role.place == 1)
    {
      targetGroup.game.Rupnica.products.reserved = acceptedPackage
      //console.log("Reserved",targetGroup.game.Rupnica.reserved)
       console.log("Applied",targetGroup.game.Rupnica.products.reserved)
    }
    else
    {
      // if not 1

      let findRole =targetGroup.game.roles.find(x=>{return x.place==role.place})
      let rolePlace = findRole.place - 1// array start index = 0, start place =1

      let lastRoleProducts = targetGroup.game.roles[rolePlace - 1].products

      if(lastRoleProducts.hold<acceptedPackage)
      {
        acceptedPackage = lastRoleProducts.hold

        lastRoleProducts.reserved = acceptedPackage
        lastRoleProducts.hold = 0
      }
      else{
        // enougth
        lastRoleProducts.reserved = acceptedPackage
        lastRoleProducts.hold -= acceptedPackage
      }
      console.log("Applied",lastRoleProducts.reserved)
      

    }
    if(targetGroup.game.roleTurn<=1)
    {
      callNextTurn(targetGroup)
    }
    else targetGroup.game.roleTurn--
    //console.log("Roleturn on apply package",targetGroup.game.roleTurn)

}

function getChainData(targetGroup)
{
  if(targetGroup)
  {
    
    let data = {
      id:targetGroup.id,
      userTurn:targetGroup.game.roleTurn,
      turn:targetGroup.game.turn,
      demand:targetGroup.game.turnDemand,
      rupnicaRequest:targetGroup.game.Rupnica.products.reserved,
      rupStorageRequest:targetGroup.game.roles[0].products.reserved,
      vairumStorageRequest:targetGroup.game.roles[1].products.reserved,
      rupnicaStorage:targetGroup.game.roles[0].products.hold,
      vairumStorage:targetGroup.game.roles[1].products.hold,
      mazumStorage:targetGroup.game.roles[2].products.hold
    }
    
    return data
  }
  else 
  {
    console.log("Failed to gather chain data")
    return
  }
}

class gameInstance{
  constructor(){
    this.gameStarted = false
    this.turn = 0
    this.lastTurn = randomValue(MIN_LENGTH,MAX_LENGTH)
    this.roleTurn = 0 // 1 2 3
    this.turnDemand = 0

    this.roleCount = 0
    this.turnLog = {}
    this.gameLog =[]
    this.roomKey = randomValue().toString()
    this.Rupnica = {
      name:"Rupnica",
      products:{
        reserved:0
      }
    }
    this.roles =[
      { 
        place:1,
        name:"Rupnicas glabtuve",  
        avaiable:true,
        user:{}, 

        products:{
          hold:randomValue(15,20),
          reserved:0
        }
      },
      {
        place:2,
        name:"Vairumtirgotajs",
        avaiable:true,
        user:{},

        products:{
          hold:randomValue(15,20),
          reserved:0
        }

      },
      {
        place:3,
          name:"Mazumtirgotajs",
          avaiable:true,
          user:{},

          products:{
            hold:randomValue(15,20)
            //reserved:0
          }
      }
    ]


  }

  
  getDemand(){
    // f
    let a = Math.random()
    //console.log("In demand",a)
    
    switch(true)
    {
      case a<=0.028:
        return 2
      case a<=0.083:
        return 3
      case a<=0.167:
        return 4
      case a<=0.278:
        return 5
      case a<=0.417:
        return 6
      case a<=0.583:
        return 7
      case a<=0.722:
        return 8
      case a<=0.833:
        return 9
      case a<=0.917:
        return 10
      case a<=0.972:
        return 11
      default:
        return 12
    }
  }
  applyDemand(){
    let target = this.roles.find(x=>{return x.name=="Mazumtirgotajs"})
    if(target.products.hold>=this.turnDemand)
    {
      target.products.hold-=this.turnDemand
    }
    else{
      target.products.hold = 0
    }
  }

  getActiveUser(){
    
    let userRole = this.roles.find((x)=>{return x.place == this.roleTurn})
    //console.log(userRole)
    return userRole.user
  }

  findAvaiableRole(){
    //console.log("All roles",this.RoleNames)
    for(let i in this.roles){
      

      if(this.roles[i].avaiable==true)return this.roles[i]
    }
    return false
  }
  addUser(userName)
  {
    let foundRole = this.findAvaiableRole()
    
    
    if(!foundRole||userName == undefined){
      return false
    }
    else
    {
      
      foundRole.avaiable = false
      foundRole.user = userName
      this.roleCount+=1
      //console.log("User added:",foundRole.user,"added to room",this.roomKey,"as",foundRole.name )
      //console.log("Role now",foundRole)
      
      console.log("Info:",this.roomKey,"room participants count:",this.roleCount)
      return true
    }
  }

  movePackages(){
    console.log(this.roomKey, "Reserves are moved.")
    // get values as numbers, not string
    let rupnicaReserved = parseInt(this.Rupnica.products.reserved)

    let rupnicaStorageHold = parseInt(this.roles[0].products.hold)
    let rupnicaStorageReserved = parseInt(this.roles[0].products.reserved)

    let vairumReserved =parseInt(this.roles[1].products.reserved)
    let vairumHold =parseInt(this.roles[1].products.hold)

    let mazumHold =parseInt(this.roles[2].products.hold)

    

    rupnicaStorageHold+=rupnicaReserved
    rupnicaReserved =0


    vairumHold+= rupnicaStorageReserved
    rupnicaStorageReserved =0

    mazumHold+=vairumReserved
    vairumReserved =0

    this.Rupnica.products.reserved = rupnicaReserved
    this.roles[0].products.hold = rupnicaStorageHold
    this.roles[0].products.reserved = rupnicaStorageReserved

    this.roles[1].products.hold = vairumHold
    this.roles[1].products.reserved = vairumReserved

    this.roles[2].products.hold = mazumHold


  }

  removeUser(userName){
    console.log("Try to remove :", userName)
    for(let i in this.roles)
    {
      //console.log("remove user",userName,"now", this.roles[i].user)
      if(this.roles[i].username == userName){
        
        this.roles[i].avaiable = true
        this.roles[i].username = {}
        this.roleCount-=1
        console.log("Removed:",userName, "from role:", i,this.roles[i].name,"Room participants count:",this.roleCount)

        return true
        
      }
      //console.log("Failed to remove",userName, "from role:", this.roles[i])
    }
      return false
  }
}

function destroyGroup(targetGroup)
{
  while(targetGroup.users.length>0)
  {

    tempUser=targetGroup.users.shift()
    console.log("Out:", tempUser)
    io.to(tempUser.id).emit("to start room")
    io.in(tempUser.id).socketsJoin('start room');
    io.in(tempUser.id).socketsLeave(targetGroup.id);
    let target= users.find((obj)=>{ // find in users and send to start
      return obj.username == tempUser.username
    })
    target.group = {}
  }
  let i = groups.indexOf(targetGroup)
  groups.splice(i,1)
  updateRoomCount()
  io.local.emit('update avaiable rooms',avaiable_room_count,max_rooms)
}

function getActiveUserId(group){
  let userName = group.game.getActiveUser()
  let userID = group.users.find((x)=>{return x.username == userName})
  //console.log(userID)
  return userID.id
}

function startGame(group)
{
  
  group.game.gameStarted = true
  group.game.turn++
  group.game.roleTurn=3
  group.game.turnDemand = group.game.getDemand()
  //console.log("After demand call",group.game.turnDemand)

  let turnStartProtocol = {
    turn:group.game.turn,
    demand:group.game.turnDemand,
    factory:{
      products:group.game.Rupnica.products
    },
    role1:{
      place:group.game.roles[0].place,
      products:group.game.roles[0].products
    },
    role2:{
      place:group.game.roles[1].place,
      products:group.game.roles[1].products
    },
    role3:{
      place:group.game.roles[2].place,
      products:group.game.roles[2].products
    }
  }

  group.game.turnLog = deepCopy(turnStartProtocol) // no shadow copies
  console.log("Turn start log",group.game.turnLog)
  group.game.applyDemand()
  console.log("Game",group.game.roomKey,"started, demand:",group.game.turnDemand)
  
}

// Room choose page
function updateRoomCount(){
  avaiable_room_count = max_rooms  - groups.length
  io.local.emit('update avaiable rooms',avaiable_room_count,max_rooms)
}
function returnToLobby(username,userGroup)
{
  // return to lobby
  console.log(username,"trying to return to lobby")
}
function registerUser(username,id)
{
    // Does the user already exist? If so, verify it's a disconnect
    //console.log("Register with values:",username,id)
    let target= users.find((obj)=>{
      return obj.username == username
    })
    if (target) {
        if (target.id)
         {
          console.log("User already online",users)
          return null;
         }
        target.id = id;
        return target;  //return existing user with update
    }
  
    var userLookup = { "username": username, "id": id, "group": null };
    // Let's update our big table
    //console.log('added user', userLookup.name, 'in users')
  
    users.push(userLookup);
    return userLookup; //return new user
}



// Chatroom

let numUsers = 0;

io.on('connection', (socket) => {
  updateRoomCount()
  let addedUser = false;

  socket.join('start room')

  socket.on('start game',()=>{
    //console.log(socket.username,"Try to start game",groups)
    let targetGroup = groups.find((x)=>{
      return x.creator == socket.username
    })
    if(targetGroup){
      startGame(targetGroup)
      let data = getChainData(targetGroup)

      let setUserPlace = []
      for(let i in targetGroup.game.roles)
      {

        let userData ={place:targetGroup.game.roles[i].place, username:targetGroup.game.roles[i].user,name:targetGroup.game.roles[i].name}
        setUserPlace.push(userData)
      }
      //console.log(setUserPlace)
      console.log("Group", targetGroup.id,"with length",targetGroup.game.lastTurn)
      io.to(targetGroup.id).emit('game started',data.id,setUserPlace)
      io.to(targetGroup.id).emit('update game',data)
      io.in(targetGroup.id).socketsLeave('start room')
      console.log()
      console.log("Turn opened to",getActiveUserId(targetGroup), targetGroup.game.roleTurn)
      io.to(getActiveUserId(targetGroup)).emit('turn opened',data)

    }
  })
  socket.on('submit turn',(data)=>{
    // find group
    console.log('Got answer from player',data)
    
     
    let acceptedPackage = data.package
    if(data.package =='') acceptedPackage =0
    let targetGroup = groups.find((x)=>{
      return x.id == data.id
    })
    
    //console.log("Group found",targetGroup.game.turn)
    if(targetGroup)
    {
      
      // find user role
      let role = targetGroup.game.roles.find((x)=>
      {
        return x.user == socket.username
      })
      console.log("Role place is:",role.place,"and expected user place is :",targetGroup.game.roleTurn)
      if(role && targetGroup.game.roleTurn == role.place)
      {
        // apply package

        applyPackage(targetGroup,role,acceptedPackage)
        //console.log(getChainData(targetGroup))
        io.to(targetGroup.id).emit('update game',getChainData(targetGroup))
        callNextUser(targetGroup)

      }
       else {console.log("Error: But wrong role calls.")}
      
       
    }else console.log("Failed to apply package")
  })

  socket.on('create room',()=>{
    if(avaiable_room_count>0)
    {
      console.log("Find user:",socket.username)
      let findCreator= users.find((obj)=>{ // find creator
        return obj.username == socket.username})
      if(findCreator)
      {
        
        //console.log("Creator found",findCreator,findCreator.username)
        let newGame = new gameInstance()
        let creator = {username:findCreator.username,id:findCreator.id}
        let newGroup = {creator:creator.username,game:newGame,users:[],id:newGame.roomKey}
        findCreator.group = newGame.roomKey
        newGroup.users.push(creator)
        groups.push(newGroup)
        newGame.addUser(creator.username)

        //console.log(newGroup.users)

        socket.join(newGroup.id) // .toString()
        
        updateRoomCount()
        
        let data = {
            usersInGroup:newGroup.users,
            id:newGroup.id
        }
        //console.log(data,newGroup)
        
        socket.emit('room created',data)
      }  
      else console.log("problem at create room", users,"ask",socket.username)
    }

  })
  socket.on('get in room',(roomID)=>{
    if(roomID)
    {
      
      roomID.toString()
      //console.log(roomID, "as number?",Number.isInteger(roomID), "with length",roomID.length)
      //console.log(socket.username,"try to connected to",roomID)
    if(roomID.length == 7){
      for(let i=0;i<groups.length;i++){
        //console.log("Group users",groups[i].users)
        //console.log(groups[i].id, Number.isInteger(groups[i].id))
        if(groups[i].id==roomID)
        {
          let target= users.find((obj)=>{ // user in users arr
            return obj.username == socket.username
          })
          //console.log(target,target.username, socket.username, target.id, socket.id)
          if(groups[i].users.length<3 && target) //
          {
            //console.log('Join in',roomID, Number.isInteger(roomID), target.username)
            socket.join(roomID)
            target.group = roomID
            let newUser = {username:target.username,id:target.id}
            groups[i].users.push(newUser)
            groups[i].game.addUser(target.username)
            
            socket.emit('in room',{
              id:roomID,
              users:groups[i].users
            })
            io.to(roomID).emit('room changed',groups[i].users)
            
            
            if(groups[i].game.roleCount>=3)
            {
              console.log(groups[i].users,"in group",groups[i].game.roomKey)
              console.log("Room status:","Game ready status send to ",groups[i].users[0].id)
              //io.sockets.socket(groups[i].users[0].socketID).emit('game ready')
              io.to(groups[i].users[0].id).emit('game ready')
            }
            //console.log(target.username,"successfully connected to",roomID)
            //console.log(users, "In group",groups[i].users)
            break
            

          }else console.log('noSpace')

        }else console.log('noroomID',roomID, Number.isInteger(roomID))
      }
    }else console.log('noLength')
    }else console.log('noID',roomID)
  })

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data, room) => {
    // we tell the client to execute 'new message'
    socket.to(room).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => 
  {
    //console.log('add user with values', username)
    // if in system
    if(username && username.length>2)
    {
      if (addedUser) {
        console.log("already is in system")
        return
      }
    
    let user = registerUser(username,socket.id)
    
        
    if(user) // if present
    {
      socket.username = username;
      ++numUsers;
      addedUser = true;
      let userGroup
      for (i in groups.length) //try to find user in group
      {
        userGroup = groups[i].find((obj)=>{
          return obj.users.username == socket.username;
        })
        if(userGroup) 
        {
          returnToLobby(username,userGroup) // and return it
          break
        }
      }
      
      socket.emit('login', {
      numUsers: numUsers
      });

      socket.emit("user added")
      socket.to('start room').emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
      console.log(users)
    }
    }

    
 
    
    
    
  });


  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    console.log(socket.username,"disconnected")
    let tempUser;
    for (let i=0;i<groups.length;i++)
    { // for created groups
      if(groups[i].creator == socket.username)
      { // if creator left


        //console.log("Room",groups[i], "destroyed:","Creator", groups[i].creator, "left from room")
        destroyGroup(groups[i])

        break
      }


      else{ // if not creator
        

        let target= users.find((obj)=>{ // find in users and send to start
          return obj.username == socket.username
        })
        if(target){
          target.group = "" // update user

          let targetIndex = groups[i].users.indexOf(target)
          if(groups[i].game.removeUser(target.username))
            console.log("User left:",groups[i].users.splice(targetIndex,1), "from", groups[i].id )
          else{
            console.log("User",target.username, "from deleted group, abort")
          }

          if(groups[i].game.gameStarted){
            destroyGroup(groups[i]) // now if someone left active game, group is destroyed
          }
          else                      //if not active game                    
          {
            io.to(groups[i].users[0].id).emit('game not ready')

            target= groups[i].users.find((obj)=>{ // find in users and send to start
              return obj.name == socket.name
            })
            
            if(groups[i].game.roleCount<3&&groups[i].users[0])
            {
              io.to(groups[i].users[0].socketID).emit('game not ready')
            }
            io.to(groups[i].id).emit('room changed', groups[i].users) // update table to other
          }
          

          
      }}
    }



    if (addedUser) {
      --numUsers;
      let user = users.find((obj)=>{
        return obj.username == socket.username;
      })
      //console.log("User",user.username,"left" )
      if(user) delete user.id
      // echo globally that this client has left
      socket.to('start room').emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
    console.log(users)
  });
});
