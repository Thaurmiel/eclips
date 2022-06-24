$(function() {

  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

 

  // Initialize variables
  const $window = $(window);
  const $usernameInput = $('.usernameInput'); // Input for username
  const $messages = $('.messages');           // Messages area
  const $inputMessage = $('.inputMessage');   // Input message input box

  const $loginPage = $('.login.page');        // The login page
  const $chatPage = $('.chat.page');          // The chatroom page

  const $setupPage = $('.setup.page');        // the room selector page
  const $usernameField = $('#userName');      // username in selector page
  const $createRoomButton = $('#create-room'); // button to create room
  
  const $avaiableRooms = $('#active-room-amount');
  const $maxRooms = $('#max-room-amount');      // fields to seek rooms

  const $getInRoomButton = $('#get-in-room');  // button to go to existing room
  const $inRoomPage = $('.inRoom.page');        // get in room page
  const $inRoomButton = $('#btnInRoom');        // go to lobby page
  const $altCreateRoomButton = $('#alt-create-room'); 
  const $roomIDlield = $('#formRoomId');        // field to enter id

  const $lobbyPage =  $('.lobby.page');         // pre-game lobby page
  const $lobbyID =  $('#room-id'); 
  const $lobbyUsers = $('#roomHolder');         // table to add users
  const $startGameButton = $('#start_game');    // start game button

  const $gamePage = $('.game.page');            // game page
  const $turnValue = $('#currentTurn');         // value to see current turn
  const $sendPackage = $('#submit-package');    // send package to server
  const $packageAmount = $('#package-amount');  // field to input package amount

  const $requestedFromRupnica = $('#requested-rupnica'); 
  const $requestedFromRupnicaStorage = $('#requested-rupnicas-storage'); 
  const $requestedFromVairumNoliktava = $('#requested-vairum-storage'); 
  const $demand =  $('#consumer-demand'); 
  

  const $rupnicaStorage= $('#rupnica-storage'); 
  const $vairumNoliktava = $('#vairum-storage'); 
  const $mazumNoliktava = $('#mazum-storage');
  const ctx = $('#tempStats')

  const socket = io();
  // game stat storage
  let turnExpences = 0
  let resultState = false

  let productsInTurn = 0
  const productsInChain = []

  const toConsumer = []

  const productsCreated = []

  let sentPackagesAmount = 0
  const sendAmount = []

  const expences = []
  const gameStateLabels = []
  const tempDemandData = []
  const tempSatisfactionData = []

  const result = []

 // data for calculating costs

 const HOLD_COST = 1
 const REQUEST_COST = 10
 const CREATE_COST = 3
// const AVG_DEMAND = 7
// const DEVIATION = 2.45

 // Prompt for setting a username
 let username;
 let delaultRoom = 'start room'
 let myRoomID = delaultRoom
 let tempUsername;
 //let typing =false
 let connected = false;
 let $currentInput = $usernameInput.focus();

  // external tooltip for charts
  const getOrCreateTooltip = (chart) => {
    let tooltipEl = chart.canvas.parentNode.querySelector('div');
  
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)';
      tooltipEl.style.borderRadius = '3px';
      tooltipEl.style.color = 'white';
      tooltipEl.style.opacity = 1;
      tooltipEl.style.pointerEvents = 'none';
      tooltipEl.style.position = 'absolute';
      tooltipEl.style.transform = 'translate(-50%, 0)';
      tooltipEl.style.transition = 'all .1s ease';
  
      const table = document.createElement('table');
      table.style.margin = '0px';
  
      tooltipEl.appendChild(table);
      chart.canvas.parentNode.appendChild(tooltipEl);
    }
  
    return tooltipEl;
  };
  
  const externalTooltipHandler = (context) => {
    // Tooltip Element
    const {chart, tooltip} = context;
    const tooltipEl = getOrCreateTooltip(chart);
  
    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }
  
    // Set Text
    if (tooltip.body) {
      const titleLines = tooltip.title || [];
      const bodyLines = tooltip.body.map(b => b.lines);
  
      const tableHead = document.createElement('thead');
  
      titleLines.forEach(title => {
        const tr = document.createElement('tr');
        tr.style.borderWidth = 0;
  
        const th = document.createElement('th');
        th.style.borderWidth = 0;
        const text = document.createTextNode(title);
  
        th.appendChild(text);
        tr.appendChild(th);
        tableHead.appendChild(tr);
      });
  
      const tableBody = document.createElement('tbody');
      bodyLines.forEach((body, i) => {
        const colors = tooltip.labelColors[i];
  
        const span = document.createElement('span');
        span.style.background = colors.backgroundColor;
        span.style.borderColor = colors.borderColor;
        span.style.borderWidth = '2px';
        span.style.marginRight = '10px';
        span.style.height = '10px';
        span.style.width = '10px';
        span.style.display = 'inline-block';
  
        const tr = document.createElement('tr');
        tr.style.backgroundColor = 'inherit';
        tr.style.borderWidth = 0;
  
        const td = document.createElement('td');
        td.style.borderWidth = 0;
  
        const text = document.createTextNode(body);
  
        td.appendChild(span);
        td.appendChild(text);
        tr.appendChild(td);
        tableBody.appendChild(tr);
      });
  
      const tableRoot = tooltipEl.querySelector('table');
  
      // Remove old children
      while (tableRoot.firstChild) {
        tableRoot.firstChild.remove();
      }
  
      // Add new children
      tableRoot.appendChild(tableHead);
      tableRoot.appendChild(tableBody);
    }
  
    const {offsetLeft: positionX, offsetTop: positionY} = chart.canvas;
  
    // Display, position, and set styles for font
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = positionX + tooltip.caretX + 'px';
    tooltipEl.style.top = positionY + tooltip.caretY + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
  };
 

  const gameStateChartOptions = 
  {
  type: 'line',
  data: 
  {
    labels: gameStateLabels,
    datasets: 
    [
      {
        label: 'Demand',
        data: tempDemandData,
        backgroundColor: "#BC8579",
        borderColor:"#BC3B1F",
      },
      {
        label: 'Satisfaction',
        data: tempSatisfactionData,
        backgroundColor: "#D8CB66",
        borderColor:"#ECC919",
      },
      {
        label: 'Chain expences',
        data: expences,
        backgroundColor: "#D8F0D1",
        borderColor:"#4EF421",
      },
    ]
  },
  options: 
  {
    responsive: true,

    interaction: {
    mode: 'index',
    intersect: false,
    },

    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
      }
    },
    plugins: 
    {
      title: 
      {
          display: true,
          text: 'Game state',
          font:{
            size:14
          }
      },
      legend: 
      {
          position: 'bottom'
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        external: externalTooltipHandler
      }

    },
  }
  }

  const gameStateChart = new Chart(ctx, gameStateChartOptions);






  const average = (a) =>{
    let sum =  0
    let n = a.length
    for (let i = 0; i < n; i++) sum += parseInt(a[i]);
    return parseFloat(sum / n);
  }
  const addParticipantsMessage = (data) => {
    let message = '';
    if (data.numUsers === 1) {
      message += `there's 1 participant`;
    } else {
      message += `there are ${data.numUsers} participants`;
    }
    log(message);
  }


  const tryConnectToRoom=()=>{
    let targetID = cleanInput($roomIDlield.val().trim());
    console.log("Sent", targetID)
    socket.emit('get in room', targetID)
}
  // Sets the client's username
  const setUsername = () => {
    tempUsername = cleanInput($usernameInput.val().trim());
    
    // If the username is valid
    if (tempUsername) {
      socket.emit('add user', tempUsername);
      console.log("try to add")
    }
  }



  // Sends a chat message
  const sendMessage = () => {
    let message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username, message });
      // tell server to execute 'new message' and send along one parameter
      console.log("Send",message ,"in room",myRoomID)
      socket.emit('new message', message, myRoomID);
    }
  }

  // Log a message
  const log = (message, options) => {
    const $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  const addChatMessage = (data, options = {}) => {
    // Don't fade the message in if there is an 'X was typing'
    const $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const typingClass = data.typing ? 'typing' : '';
    const $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }



  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el, options) => {
    const $el = $(el);
    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }
    

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.danger)
    {
      $el.css('color', 'red')
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }

    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  const lobbyUserTable = (data) =>
  {
    $lobbyUsers.empty()
    for(let i=0;i<3;i++)
    {
      if(data[i])
      {
        $lobbyUsers.append(`<th>${data[i].username}</th>`)
      }

    }
  }
  const gameChainUpdate = (data)=>
  {
    if (data)
    {
      //log('chain updated')

      $turnValue.text(data.turn) 
      
      $demand.text(data.demand)
      //console.log($demand.text())
      $requestedFromRupnica.text(data.rupnicaRequest)
      //console.log($requestedFromRupnica.text())
      $requestedFromRupnicaStorage.text(data.rupStorageRequest)
      //console.log($requestedFromRupnicaStorage.text())
      $requestedFromVairumNoliktava.text(data.vairumStorageRequest)
      //console.log($requestedFromVairumNoliktava.text())

      $rupnicaStorage.text(data.rupnicaStorage)
      $vairumNoliktava.text(data.vairumStorage)
      $mazumNoliktava.text(data.mazumStorage)
    }

  }




  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  const getUsernameColor = (username) => {
    // Compute hash code
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        
      } else {
        setUsername();
      }
    }
  });



  // Click events
  $createRoomButton.click(()=>{
    socket.emit('create room')
  })
  $altCreateRoomButton.click((e)=>{
    e.preventDefault()
    socket.emit('create room')
    $inRoomPage.hide().off('click')
  })

  $getInRoomButton.click(()=>{
    $setupPage.hide()
    $setupPage.off('click');
    $inRoomPage.show();
    $roomIDlield.val('').focus()

  })

  $inRoomButton.click((e)=>{
    e.preventDefault()
    tryConnectToRoom()
  })

  $startGameButton.click(()=>{
    console.log("Try to start game")
    socket.emit('start game')
  })

  $sendPackage.click((e)=>{
    e.preventDefault()
    let packageAmount = cleanInput($packageAmount.val().trim())
    //console.log(package,typeof(package))
    let data = 
    {
      id:myRoomID,
      package:packageAmount
    }
    if(!data.package) 
    { 
      data.package = 0
      console.log('No package send',data.package)
    }
    socket.emit('submit turn',data)
    $sendPackage.attr("disabled", true)
  })
  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });



  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    const message = 'Welcome to ECLIPS chat – ';
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', (data) => {
      addChatMessage(data);
  });

  socket.on('user added',(data)=>{

    if(!data)
    {
      username = tempUsername
      console.log("added", username)
      $usernameField.text(username)
      $loginPage.fadeOut(function(){
        $chatPage.show();
        $setupPage.show();
      });
      $loginPage.off('click');
  

      
      //$currentInput = $inputMessage.focus();
    }
    else
    {
      console.log("YOY",data)
      if(data.group !=null)
      {
        // go to room
      }
      else{
        console.log("reload")
          //window.location.reload()
      }
      
    }

  })
  socket.on('room created',(data)=>{
    console.log("created room with",data )
    console.log(data.id,Number.isInteger(data.id))
    $setupPage.hide()
    $setupPage.off('click');
    $lobbyID.text(data.id)
    
    $lobbyPage.show()
    lobbyUserTable(data.usersInGroup)
    let options = {
      danger:true
    }
    log(`Redirected to ${data.id} channel`, options)
  })
  socket.on('in room',(data)=>{
    console.log("Server responded",data)
    let options = {
      danger:true
    }
    log(`Redirected to ${data.id} channel`,options)
    $inRoomPage.hide()
    $lobbyPage.show()
    myRoomID = data.id
    $lobbyID.text(data.id)
    lobbyUserTable(data.users)
  })
  socket.on('room changed',(data)=>{
    console.log('room changed', data)
    lobbyUserTable(data)
  })
  socket.on('game started',(roomID,userPlaces)=>{

    $(".chart").show()

    myRoomID = roomID
    

    for (i in userPlaces)
    {
      if(userPlaces[i].username==username)
      {
        console.log(userPlaces[i],"is user")
        $(`#${userPlaces[i].place}`).css("background-color", "#EDF57E")
        break
      }
    }
    log("Game started, chat is isolated now")
    $lobbyPage.fadeOut(()=>{
      $gamePage.show()
    })
  })
  socket.on('update game',(data)=>{
    gameChainUpdate(data)
    $('#rupnica-storage').removeClass("active")
    $('#vairum-storage').removeClass("active")
    $('#mazum-storage').removeClass("active")
    switch(true){
      case data.userTurn==3:
        $('#mazum-storage').addClass('active')
        break
      case data.userTurn==2:
        $('#vairum-storage').addClass('active')
        break
      case data.userTurn==1:
        $('#rupnica-storage').addClass('active')
        break
      default:
        console.log("Failed")
    }
  })
  socket.on('turn opened',()=>{
    $sendPackage.removeAttr("disabled");
    log("Your turn")
  })
  socket.on('update avaiable rooms',(avaiable, max)=>{
    
    $maxRooms.text(max)
    $avaiableRooms.text(avaiable)
    if(avaiable<1) $createRoomButton.disabled = true
  } )

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', (data) => {

      log(`${data.username} joined`);
      addParticipantsMessage(data);

  });
  socket.on('game ready',()=>{
    $startGameButton.removeAttr("disabled");
    log('Game ready!')
  })
  socket.on('game not ready',()=>{
    $startGameButton.attr("disabled", true);
    log('Game not ready for now.')
  })
  socket.on('to start room',()=>{
    let options = {
      danger: true
    }
    log(`Lobby ${myRoomID} destroyed, back to start`,options)
    myRoomID = delaultRoom
    $setupPage.show()
    $lobbyPage.hide()
    $gamePage.hide()
    $('#tempStats').hide()

    turnExpences = 0
  resultState = false

  productsInTurn = 0
  productsInChain.length=0

  toConsumer.length=0

  productsCreated.length=0

  sentPackagesAmount = 0
  sendAmount.length=0

  expences.length=0
  gameStateLabels.length=0
  tempDemandData.length=0
  tempSatisfactionData.length=0

  result.length=0

  })

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', (data) => {
    let options = {
      danger: true
    }
    log(`${data.username} left`,options);
    addParticipantsMessage(data);
    
  });

  socket.on('game end',(gameLog)=>{
    resultState = true
    log("Game ended")
    myRoomID = delaultRoom
    gameStateChart.destroy()
    $(".chart").hide()
    console.log(gameLog)
    $gamePage.hide()
    $('.results').show()

    /*
    $("#getCSV").click(()=>{
      const xls = new xlsExport(result, "gameResults");
      xls.exportToXLS('export.xls')
    })
    */
    let avgSatisfaction = average(tempSatisfactionData)
    if(avgSatisfaction>=95){
      $('#avg-satisfaction').text(`${avgSatisfaction}%, good work!`)
    }
    else   $('#avg-satisfaction').text(`${avgSatisfaction}%. Seems something went wrong...`)
   

    const endGameOptions =
    {
      type: 'line',
      data: {
        labels: gameStateLabels,
        datasets: 
        [
          {
            label: 'Demand',
            data: tempDemandData,
            backgroundColor: "#BC8579",
            borderColor:"#BC3B1F",
          },
          {
            label: 'Satisfaction, %',
            data: tempSatisfactionData,
            backgroundColor: "#D8CB66",
            borderColor:"#ECC919",
          },
          {
            label: 'Chain expences',
            data: expences,
            backgroundColor: "#D8F0D1",
            borderColor:"#4EF421",
          },
          {
            label: 'Product holds in chain',
            data: productsInChain,
            backgroundColor: "#D7E8BEA",
            borderColor:"#2840EC",
            hidden:true
          },
          {
            label: 'Delivered to consumer',
            data: toConsumer,
            backgroundColor: "#B7E3DB",
            borderColor:"#24E7C6",
            hidden:true,
            fill: true
          },
          {
            label: 'Products created',
            data: productsCreated,
            backgroundColor: "#F4E2A4",
            borderColor:"#FFC500",
            hidden:true
          },
          {
            label: 'Packages send',
            data: sendAmount,
            backgroundColor: "#8C7DCA",
            borderColor:"#2B03CF",
            hidden:true
          }
        ]
      },
      options: {
        interaction: {
          mode: 'index',
          intersect: false,
        },
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
          },
        },
        plugins: 
        {

          title: 
          {
            display: true,
            text: 'Game Statistics',
            font:{
              size:14
            }
          },
          legend: 
          {
            position: 'bottom'
          },
          tooltip: {
            enabled: false,
            position: 'nearest',
            external: externalTooltipHandler
          }
        },  
      }
    }

    const endChart = new Chart($('#gameStats'), endGameOptions);
  
    result.push(productsInChain,toConsumer,productsCreated,sendAmount,expences,gameStateLabels,tempDemandData,tempSatisfactionData)

  })



  function calculateExpences(turnLog){
    if(turnLog){
      if(turnLog.factoryEnd.products.reserved){
        turnExpences+=REQUEST_COST
      } else{console.log("No package")}
      if(turnLog.role1End.products.reserved){
        turnExpences+=REQUEST_COST
      }else{console.log("No package")}
      if(turnLog.role2End.products.reserved){
        turnExpences+=REQUEST_COST
      }else{console.log("No package")}
      let role1Hold = parseInt(turnLog.role1.products.hold)
      let role2Hold = parseInt(turnLog.role2.products.hold)
      let role3Hold = parseInt(turnLog.role3.products.hold)
  
      turnExpences+= HOLD_COST*role1Hold+HOLD_COST*role2Hold+HOLD_COST*role3Hold
      let createdProduct = parseInt(turnLog.factoryEnd.products.reserved)
      turnExpences+= CREATE_COST*createdProduct
    }
    else{
      console.log("Error on calc costs")
    }
  }
  socket.on('update statistics', (turnLog=>{
    //console.log(turnLog)
    gameStateLabels.push(turnLog.turn)
    tempDemandData.push(turnLog.demand)

    // if not reserved => 0 => false 
    calculateExpences(turnLog)
    expences.push(turnExpences)
    
    let safisfactonLevel = 100*(turnLog.role3.products.hold-turnLog.role3End.products.hold)/turnLog.demand
    //console.log("Debug",turnLog.demand,turnLog.role3.products.hold-turnLog.role3End.products.hold,safisfactonLevel)
    tempSatisfactionData.push(safisfactonLevel)

    let role1Hold = parseInt(turnLog.role1.products.hold)
    let role2Hold = parseInt(turnLog.role2.products.hold)
    let role3Hold = parseInt(turnLog.role3.products.hold)
    productsInTurn = 0
    productsInTurn+=role1Hold+role2Hold+role3Hold
    productsInChain.push(productsInTurn)

    toConsumer.push(turnLog.role3.products.hold-turnLog.role3End.products.hold)

    productsCreated.push(turnLog.factoryEnd.products.reserved)
    
    sentPackagesAmount = 0
    sentPackagesAmount = parseInt(turnLog.factoryEnd.products.reserved) +parseInt(turnLog.role1End.products.reserved)+parseInt(turnLog.role2End.products.reserved)
    sendAmount.push(sentPackagesAmount)
    
    gameStateChart.update()
    
  }))

  



  socket.on('disconnect', () => {
    log('you have been disconnected');
    $gamePage.hide()
  });

  socket.io.on('reconnect', () => {
    console.log("GameState is:",resultState)
    if(!resultState){
      $startGameButton.attr("disabled", true);
      log('you have been reconnected');
      if (username) {
        socket.emit('add user', username);
      }
      myRoomID = delaultRoom
      console.log(myRoomID)
      $lobbyPage.hide()
    }
  });

  socket.io.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

});
