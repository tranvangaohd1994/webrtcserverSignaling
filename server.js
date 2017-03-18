//require our websocket library
var WebSocketServer = require('ws').Server;
//creating a websocket server at port 9091
var wss = new WebSocketServer({port: 9091});
console.log("server is running");

//all connected to the server ArrayRooms
var ArrayRooms = [];//khai bao 1mang
var numRoom=0;
//when a user connects to our sever
wss.on('connection', function(connection) {

   console.log("User connected");
   connection.statusG=1;//1 la trang thai ket noi voi server chua lam gi ca
   var indexInRooms=-2;
   //when server gets a message from a connected user
   connection.on('message', function(message) {
      var data;
      //accepting only JSON messages
      try {
         data = JSON.parse(message);
      } catch (e) {
         console.log("Invalid JSON");
         data = {};
      }

      //switching type of the user message
      switch (data.type) {
         //when a user tries to login
         case "login":
            for (indexInRooms=0; indexInRooms < numRoom; indexInRooms++)
                {   ///neu da co room
                    if (ArrayRooms[indexInRooms].name === data.name){
                      //neu room co 2 nguoi thi thohng bao full
                      if(ArrayRooms[indexInRooms].numMember==2){
                        sendTo(connection, {
                           type: "login",
                           success: false,
                           innivitor: true
                        });
                        console.log("Room "+data.name +" is full");
                      }//neu room chua day
                      else{
                        ArrayRooms[indexInRooms].numMember=2;
                        ArrayRooms[indexInRooms].connec2=connection;
                        sendTo(connection, {
                           type: "login",
                           success: true,
                           innivitor: false
                        });
                        connection.isInitiator=false;
                        console.log("Room "+data.name +" is ready");
                        connection.statusG=2;//login thanh cong
                      }
                      break;//thoat khoi vong for
                    }
                }
                //neu da duyet hetmang cac Room ma ko tim thay room nao gionf ten thi tra ve khoi tao room moi
                if(indexInRooms== numRoom){
                  numRoom++;
                  var room={};
                  room.name=data.name;
                  room.numMember=1;
                  room.connec1=connection;
                  room.connec2=null;
                  ArrayRooms[indexInRooms]=room;
                  //gui lai ve la khoi tao phong thanh cong
                  sendTo(connection, {
                     type: "login",
                     success: true,
                     innivitor: true
                  });
                  connection.isInitiator=true;
                  console.log("Room "+data.name +" is inited. number of ArrayRooms:" +numRoom+" "+indexInRooms);
                  connection.statusG=2;//login thanh cong
                }
            break;

         case "offer":
            //for ex. UserA wants to call UserB
            console.log("sending offer to innivitor ");
            sendTo(ArrayRooms[indexInRooms].connec1,{
               type: "offer",
               offer: data.offer
            });
            break;

         case "answer":
              console.log("Sending answer to: joiner");
               sendTo(ArrayRooms[indexInRooms].connec2, {
                  type: "answer",
                  answer: data.answer
               });

               break;

         case "candidate":
            console.log(" Sending candidate:" );
            if(connection.isInitiator){
               sendTo(ArrayRooms[indexInRooms].connec2, {
                  type: "candidate",
                  candidate: data.candidate
               });
            }
            else if(!connection.isInitiator){
               sendTo(ArrayRooms[indexInRooms].connec1, {
                  type: "candidate",
                  candidate: data.candidate
               });
             }
            break;

         case "leave":
             if(connection.isInitiator){
               //neu la thang tao phong thi gui cho thang con lai
               sendTo(ArrayRooms[indexInRooms].connec2,{
                  type: "leave"
               });
             }
             else{
               sendTo(ArrayRooms[indexInRooms].connec1,{
                    type: "leave"
                 });
               }
             //xoa room khoi danh sach room
             ArrayRooms.splice(indexInRooms,1);
             numRoom--;

            break;

        case "resetRoom":
            connection.isInitiator=true;
            break;
         default:
            sendTo(connection, {
               type: "error",
               message: "Command not found: " + data.type
            });

            break;
      }

   });

   //when user exits, for example closes a browser window
   //this may help if we are still in "offer","answer" or "candidate" state
   connection.on("close", function() {


     //close--truong hop 1 thang vao chua tao room va thoat app thi ko lam gi ca
     if(indexInRooms >= 0){ //da tao phong
      if(ArrayRooms[indexInRooms].numMember==2){//neu phong dan co 2 nguoi
        if(connection.isInitiator){//thang 1 roi di
          sendTo(ArrayRooms[indexInRooms].connec2,{
             type: "resetRoom"
          });
          //reset lai room
          ArrayRooms[indexInRooms].numMember=1;
          ArrayRooms[indexInRooms].connec1=ArrayRooms[indexInRooms].connec2;
          ArrayRooms[indexInRooms].connec2=null;
          console.log("innivitor-1- exit");
        }
        else{//thang 2 roi di
          sendTo(ArrayRooms[indexInRooms].connec1,{
             type: "resetRoom"
          });
          //reset lai room
          ArrayRooms[indexInRooms].numMember=1;
          //ArrayRooms[indexInRooms].connec1=ArrayRooms[indexInRooms].connec2;
          ArrayRooms[indexInRooms].connec2=null;
          console.log("joiner-2- exit");
        }

      }
      else if(ArrayRooms[indexInRooms].numMember==1){
        //neu room chi co 1 thang thi cu delete thoi
              //xoa room khoi danh sach room
              ArrayRooms.splice(indexInRooms,1);
              numRoom--;
              console.log("delete room index ",indexInRooms);
        }
    }

   });

   //connection.send("Hello world");
});

function sendTo(connection, message) {
   connection.send(JSON.stringify(message));
}
