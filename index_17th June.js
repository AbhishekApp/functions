/**
 * Created by manish on 3/30/2017.
 */
const functions = require('firebase-functions');

// // Start writing Firebase Functions
// // https://firebase.google.com/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// })

const admin = require('firebase-admin');
const Twitter = require('twitter');

admin.initializeApp(functions.config().firebase);

	
	exports.managePrediction = functions.analytics.event('canned_sent').onLog(event => {
		const node = event.data.val();
		console.log("canned_sent node "+node);
		console.log("canned_sent node "+node.custom_event);
	});

	
	exports.createPrediction = functions.database.ref('/EventList/{index}/Cate/{subindex}/Sub_cate/{innerindex}')
	.onWrite(event => {
		const node = event.data.val();
		
		console.log("prediction "+node.prediction);
		if(String(node.prediction).trim().length > 0){
			var eventID = String(node.event_id).trim();
			console.log("Event ID : "+eventID);
			var predictionHistory = admin.database().ref('/PredictionHistory/'+eventID);
			var prediction = String(node.prediction).split(",");
		//	console.log("prediction.length : "+prediction.length);
			var myPredict =  {};
		//	console.log("myPredict : "+JSON.stringify(myPredict));
			
			for(var i = 0; i < prediction.length; i++){
		//		console.log("prediction[i] :"+String(prediction[i]).trim()+":");
				myPredict[String(prediction[i]).trim()] = "user"; 
			}
			
			predictionHistory.set(myPredict).then(snapshot => {
				console.log("predictionHistory History Created.");
			}).catch(error => { console.error("predictionHistory History Updated Failed : "+error); });
		}
		
	});
	
	
	/*		Engagement Node Reference 		*/
	var engagementNode = admin.database().ref('/Engagement');
	var predictionEarnWon = 0;
	var predictionBurnWon = 0;
	var niceMsgChar = 0;
	var niceMsgWon = 0; 
	
	engagementNode.on("value", function(snapshot){
		var engagement = snapshot.val();
	//	console.log("Engagement : "+engagement);
	//	console.log("engagement.Earn.Prediction : "+engagement.Earn.Prediction);
		predictionEarnWon = engagement.Earn.Prediction;
		predictionBurnWon = engagement.Burn.Prediction;
		niceMsgChar = engagement.Earn.NiceMsg.Chars;
		niceMsgWon = engagement.Earn.NiceMsg.Won;
	}, function(errorObject){
		console.log("Engagement ERROR: "+errorObject);
	});
	
	/*		tweet Rule		*/
	var tweet;
	var tweetHandleTime;
	var tweetRule = admin.database().ref('/tweetsRule');
	
	tweetRule.on("value", function(snapshot){
		tweet = snapshot.val();
		tweetHandleTime = tweet.lastTweetUpdate;
	});
	
	function twitterHandle(chatPath, eventTitle, updateTime, methodfrom){
		console.log("Tweeter Handle..updateTime : "+updateTime);
		var timestamp = new Date(getTodayDate());
		var tweetRef = admin.database().ref(chatPath);
		var lastTweetTime = new Date(tweetHandleTime);
		console.log("Tweet Last Tweeted Time : "+lastTweetTime.getTime());
		console.log("Tweet New timestamp : "+timestamp.getTime());
		
		var diff = timestamp.getTime() - lastTweetTime.getTime();
		console.log("Tweet Time Difference : "+diff);
		if(diff > 3 * 1000 || methodfrom=="prediction"){
			var client = new Twitter({
			  consumer_key: 'PITblWnQiqfhIaRZJ4mPHVN1Y',
			  consumer_secret: 'mOT5zTQCKXK9YuIFkTH2BxWnwIgAT65z6JrFlUwDVcmUu5jhmj',
			  access_token_key: '862618069348171776-ZLUi8XigPrqIR3VbDyOCrjUBalvyC87',
			  access_token_secret: 'NrItyYw62qGofpNLAeIy8ZEFsObDcSPj0UcEJPf9xGN0P'
			});

			client.get('search/tweets', {q: eventTitle, result_type:'recent', count:'1'}, function(error, tweets, response) {
				console.log("Tweet Response : "+JSON.stringify(response));
				if(error) throw error;
				if (!error){
				   console.log("Tweets Length : "+tweets.statuses.length);
				   var i = 0;
				   var names = ["Rohit,", "Anurag", "Dheeraj", "Pratap", "Ashok", "Amit", "Sandeep", "Anuj", "Akash", "Vaibhav", "Saourabh"];
				   tweets.statuses.forEach(function tweetFunction(item, index){
					   
					   setTimeout(function(){ 
							console.log(tweets.statuses[index].text);
							var tweetTxt = tweets.statuses[index].text;
							var twt = [];
							if(tweetTxt.indexOf("https://t.co")!=-1){
								twt = tweetTxt.split("https://t.co");   
							}else{
								twt[0] = tweetTxt;
							}
							if(twt[0].indexOf("https:…")!=-1){
								twt[0] = twt[0].replace(/https:…/g,"");
							}
							if(twt[0].indexOf("RT")!=-1){
								twt[0] = twt[0].replace("RT","");
							}
							if(twt[0].indexOf("#")!=-1){
								twt[0] = twt[0].replace(/#/g,"");
							}
							if(twt[0].indexOf("@")!=-1){
								twt[0] = twt[0].replace(/@/g,"");
							}

							console.log("Tweets : "+twt[0]);
							i++;
							if(i >= 11){
								i = 0;
							}
							var newMsg = {
							  "author" : names[i],
							  "authorType" : "user",
							  "messageType" : "feed",
							  "timestamp" : timestamp,
							  "title" : twt[0],
							  "toUser" : ""
							};
							tweetRef.push().set(newMsg).then(metasnapshot => {
												console.log("Tweet Push Successfully NEW TIME : "+updateTime);
												tweet["lastTweetUpdate"] = updateTime;
												tweetRule.update(tweet);
										   }).catch(error => {console.log("Tweet Push ERROR: "+error);});  ;

					    }, 3000);
				   });
				   console.log("Total Length : "+i);
				}
				  
			});
			
		}
		
	/*
		var day = currentTime.getDate();
		var mm = currentTime.getMonth()+1; 
		var year = currentTime.getFullYear();
		var hour = currentTime.getHours();
		var minute = currentTime.getMinutes();
		var second = currentTime.getSeconds();
		var newTime = Date(year, mm, day, hour, minute, second, 0);
	*/
		
	}
	
	exports.twitterResponse = functions.database.ref('/Timeline/{userid}/{matchname}')
    .onWrite(event => {
		const node = event.data.val();
		var chatPath = node.chat_path;
		var eventTitle = node.event_title;
		var updatetime = node.time_stamp;
		console.log("Chat Path : "+chatPath);
	//	var tweetRef = admin.database().ref(chatPath);
		twitterHandle(chatPath, eventTitle, updatetime, "");
	});
	
	exports.noticePrediction = functions.database.ref('/Cricket/{subcate}/{matchname}/{matchid}/StadiumChat/{pushId}')
    .onWrite(event => {
		const node = event.data.val();
		var eventID = String(event.params.matchid).trim();
	//	console.log("Cate subcate : "+event.params.subcate);
	//	console.log("Cate matchname : "+event.params.matchname);
	//	console.log("Cate matchid : "+event.params.matchid);
	//	console.log("Cate pushId : "+event.params.pushId);
	//	console.log("node author  : "+node.author);
	//	console.log("node authorType  : "+node.authorType);
	//	console.log("node title match prediction : "+node.title.indexOf("#prediction"));
	//	console.log("node title  : "+node.title);

	/*		WonHistory Node Reference		*/
	var balance = 0;
	var wonMeta;
	var wonHistory = admin.database().ref('/WonHistory/'+node.toUser);
	if(!(node.authorType == "com" && node.title.indexOf("#notifier") != -1 && node.title.indexOf("#result") != -1 && node.toUser.indexOf("850f0ea660de946e") != -1)){
		wonHistory.once("value", function(snapshot) {
			var wonJson = snapshot.val();
		//	console.log("WonHistory : "+JSON.stringify(wonJson));
			var parsWon = JSON.parse(JSON.stringify(wonJson));
			balance = parseInt(parsWon.balance);
			wonMeta = parsWon.Meta;
			
			/*  	Long Message Earn Method   	*/
			//	console.log("niceMsgChar Limit : "+niceMsgChar);
				if((node.authorType == "user" || node.authorType == "")  && node.title.length >= niceMsgChar && node.messageType=="normal"){
					balance = balance + niceMsgWon;
				//	console.log("Nice Message Characters : "+node.title.length);
					
					const metWon = {"desc":"Nice message. We have added "+niceMsgWon+" WONs. Your balance : "+balance+" WONs", "earned": niceMsgWon ,"burned":0,"timeStamp":	node.timestamp};
					const newWonUser = {"balance": balance,	"Meta": wonMeta};
					var wonRef = admin.database().ref('/WonHistory/'+node.toUser);
					wonRef.set(newWonUser).then(snapshot => {
					//		 console.log("Won History Updated ");
					}).catch(error => { console.error("Won History Updated Failed : "+error); });
							
					admin.database().ref('/WonHistory/'+node.toUser+"/Meta/").push().set(metWon).then(snapshot => {
						//	console.log("Nice message Won Meta Updated Successfully");
					}).catch(error => {console.log("WonHistory meta updated ERROR: "+error);});
					
				}
				if((node.authorType == "user" || node.authorType == "")  && (node.messageType=="normal" || node.messageType=="canned")){
						var chatPath = '/Cricket/'+event.params.subcate+'/'+event.params.matchname+'/'+event.params.matchid+'/StadiumChat/';
						var twitterQuery = node.title + event.params.subcate;
						twitterHandle(chatPath, twitterQuery, node.timestamp, "prediction");
				}
				
		}, function (errorObject) {
			console.log("WonHistory failed: " + errorObject.code);
		});
	}
	
	/* 		Prediction History  Node	*/	
	var predictionHistory = admin.database().ref('/PredictionHistory/'+eventID);
	var predictionValue;
	
		/*		Prediction Burn  Method 	*/
		if((node.authorType == "user" || node.authorType == "") && node.title.indexOf("#prediction") != -1 && node.messageType=="prediction"){
				
			var flagPrediction = false;	
			var resultFlag = true;
			var sameVoteFlag = false;
			const newMsg = {
							  "author" : "admin",
							  "authorType" : "com",
							  "messageType" : "normal",
							  "timestamp" : node.timestamp,
							  "title" : "Thanks & Noted! 10 WONs consumed, you win 50 if your team wins. Start Chatting Now as it happens :",
							  "toUser" : node.toUser
							};
							
				var userPrediction = node.title.replace("#prediction", "").trim();
				
		predictionHistory.once("value", function(PredictionSnapshot){
					predictionValue = PredictionSnapshot.val();
			//		console.log("predictionValue[userPrediction] : "+predictionValue[userPrediction]);
			//		console.log("predictionValue[result] : "+predictionValue["result"]);
					if(predictionValue["result"]){
						resultFlag = false;
			//			console.log("IF predictionValue[result] : "+predictionValue["result"]);	
					}else{
						resultFlag = true;
			//			console.log("ELSE True predictionValue[result] : "+predictionValue["result"]);
						Object.keys(predictionValue).forEach(function(key) {
						var value = predictionValue[key];
			//			console.log("Prediction userPrediction : "+userPrediction+" KEY: "+key);
						if(key == userPrediction){
							flagPrediction = true;
			//				console.log("key == userPrediction flagPrediction: "+flagPrediction);
							if(value.indexOf(String(node.toUser).trim()) != -1){
									sameVoteFlag = true;
								}
						}
						if(value.indexOf(String(node.toUser).trim()) != -1 && !sameVoteFlag)
						{
							value = value.replace(new RegExp(String(node.toUser).trim(),"g"), '');
							value = value.replace(new RegExp(String(",,")), '');
			//				console.log("Removed Value : "+value);
							predictionValue[key] = value;
						}
					});
					}
					
					
			/*	}, function(error){
					console.log("Prediction ERROR : "+error);
				});
				*/
	//	console.log("resultFlag : "+resultFlag);
	//	console.log("flagPrediction : "+flagPrediction);
		if(!resultFlag){
			const newResMsg = {
							  "author" : "admin",
							  "authorType" : "com",
							  "messageType" : "normal",
							  "timestamp" : node.timestamp,
							  "title" : "Aaaw cute :) this is already a done deal",
							  "toUser" : node.toUser
							};
		admin.database().ref('/Cricket/'+event.params.subcate+'/'+event.params.matchname+'/'+event.params.matchid+'/StadiumChat/').push(newResMsg);
		}	
		else if(!flagPrediction){
				const newTryMsg = {
							  "author" : "admin",
							  "authorType" : "com",
							  "messageType" : "normal",
							  "timestamp" : node.timestamp,
							  "title" : "Did not understand :(, please choose from the Ideas(Bulb) Keyboard Option",
							  "toUser" : node.toUser
							};
		admin.database().ref('/Cricket/'+event.params.subcate+'/'+event.params.matchname+'/'+event.params.matchid+'/StadiumChat/').push(newTryMsg);
		}
		else if(sameVoteFlag){
			const newTryMsg = {
							  "author" : "admin",
							  "authorType" : "com",
							  "messageType" : "normal",
							  "timestamp" : node.timestamp,
							  "title" : "You had made this Prediction before, we have it Noted. Go ahead and Chat Now as it happens",
							  "toUser" : node.toUser
							};
		admin.database().ref('/Cricket/'+event.params.subcate+'/'+event.params.matchname+'/'+event.params.matchid+'/StadiumChat/').push(newTryMsg);
		}else{
			admin.database().ref('/Cricket/'+event.params.subcate+'/'+event.params.matchname+'/'+event.params.matchid+'/StadiumChat/').push(newMsg).then(snapshot => {
				
				
				predictionValue[userPrediction] = predictionValue[userPrediction]+","+node.toUser;
				
				predictionHistory.set(predictionValue).then(snapshot => {
				//	console.log("Predicted User List : "+JSON.stringify(predictionValue[userPrediction]));	
				}).catch(error => { console.error("predictionHistory History Updated Failed : "+error); });
			
							
				balance = balance - predictionBurnWon;
	//			console.log("Won Meta : "+JSON.stringify(wonMeta));
				
				const metaWon = {"desc":"Prediction noted and "+predictionBurnWon+" Won's consumed. Your balance : "+balance+" Won", "earned": 0 ,"burned":predictionBurnWon,"timeStamp":	node.timestamp};
				const newWonUser = {"balance": balance,
									"Meta": wonMeta};
				var wonRef = admin.database().ref('/WonHistory/'+node.toUser);
				wonRef.set(newWonUser).then(snapshot => {
					 console.log(" Won History Updated "+newWonUser);
				}).catch(error => { console.error("Won History Updated Failed : "+error); });
				
				admin.database().ref('/WonHistory/'+node.toUser+"/Meta/").push().set(metaWon).then(snapshot => {
	//				console.log("Won Meta Updated Successfully");
				}).catch(error => {console.log("WonHistory meta updated ERROR: "+error);});
				wonRef.off("value");
			}).catch(error => {
    //            console.error("Noted Failed : "+error);
			});
		}
		}, function(error){
	//				console.log("Prediction ERROR : "+error);
		});
		}
		
		
	/*  	Commentator Notifier Result	and Earn	*/
	//		console.log("Notifier RESULT Execution");
		if(node.authorType == "com" && node.title.indexOf("#notifier") != -1 && node.title.indexOf("#result") != -1 && (node.toUser.indexOf("24ca4a7b5d5dd0ef") != -1 || node.toUser.indexOf("850f0ea660de946e") != -1)){
			
	//		var userPrediction = node.title.replace("#notifier", "").trim();
	//		userPrediction = userPrediction.replace("#result", "").trim();
			var userPrediction = node.title.split("#result");
	//		console.log("User Result : "+userPrediction);
	//		console.log("User Result : "+userPrediction[1].trim());
			var userList = new Array();
			predictionHistory.once("value", function(PredictionSnapshot){
					predictionValue = PredictionSnapshot.val();
					userList = predictionValue[userPrediction[1].trim()].split(","); 
					predictionValue["result"] = userPrediction[1].trim();
					
					predictionHistory.update(predictionValue).then(snapshot => {
						
	//					console.log("Predicted Result Set : "+JSON.stringify(predictionValue));	
	//					console.log("userList.length : "+userList.length);
						predictionHistory.off("value");
					/*	for(var i = 1; i < userList.length; i++){
						//	var wonUserList = admin.database().ref('/WonHistory/'+userList[i]);
							
							
							console.log("userList["+i+"] : "+userList[i]);
							admin.database().ref('/users/'+userList[i]+"/0").on("value", function(usersSnap){
								var user = usersSnap.val();
								console.log("User : "+JSON.stringify(user));
								console.log("User Fcm ID : "+JSON.stringify(user.fcm_id));
								
								 const payload = {
												notification: {
													title: '',
													body: 'WooHoo You predicted correctly. We have added '+predictionEarnWon+' won.'
												} ,
												data:{
													eventID: eventID
												}
											};
								
								admin.messaging().sendToDevice(user.fcm_id, payload)
										  .then(function(response) {
											// See the MessagingDevicesResponse reference documentation for
											// the contents of response.
											console.log("Successfully Result sent message:", response);
										  })
										  .catch(function(error) {
											console.log("Error sending message:", error);
										  });

							});
						}
						*/
				
				
				}).catch(error => { console.log("predictionHistory History Updated Failed : "+error); });
			});
			
		}
		
	});
	
	
	exports.updateWonHistory = functions.database.ref('/PredictionHistory/{eventid}').onWrite(event => {
		const node = event.data.val();
		var userlist = new Array();
		/*		Engagement Node Reference 		*/

		var result = node.result;
	//	console.log("Result "+result);
	//	console.log("Users "+node[result]);
		userlist = node[result].split(",");
	//	console.log("userlist : "+userlist);
		if(result){
			
			userlist.forEach(function myFunction(item, i) {
			
				if(userlist[i]){
					var wonUserList = admin.database().ref('/WonHistory/'+userlist[i]);
					var wonMetaRef = admin.database().ref('/WonHistory/'+userlist[i]+'/Meta/');
					var wonbalance=0;
	//				console.log("Abhi WonUserList");
					wonUserList.once("value",  function(wonSnapShot){
										var wonJson = wonSnapShot.val();
										var parsWon = JSON.parse(JSON.stringify(wonJson));
										wonbalance = parseInt(parsWon.balance);
										wonbalance = wonbalance + parseInt(predictionEarnWon);
										var wonNewUser = {
											"balance": wonbalance,
											"Meta": wonJson.Meta
											};
											var newDate = getTodayDate();
										var metaWon = {
											"desc":"Your prediction is correct. You won "+predictionEarnWon+" Won. Your balance is "+wonbalance+" Won.",
											"earned": predictionEarnWon,
											"burned":0,
											"timeStamp": ""+newDate
											};
	//										console.log("i= "+i);
											wonUserList.set(wonNewUser).then(wonsnap => {
	//												console.log("Won History Updated ");
											}).catch(error => { console.log("Won History Updated Failed : "+error); });	
									
										wonMetaRef.push().set(metaWon).then(metasnapshot => {
	//												console.log("Won Meta Updated Successfully");
										}).catch(error => {console.log("WonHistory meta updated ERROR: "+error);});  
					});
				}
			});
		}
	});
	
	
	function getTodayDate(){
		var today = new Date();
		var day = today.getDate();
		var mm = today.getMonth()+1; 
		var year = today.getFullYear();
		var hour = today.getHours() + 5;
		var minute = today.getMinutes() + 30;
		var second = today.getSeconds();
		if(minute > 60){
			hour = hour + 1;
			minute = minute - 60;
		}
		var dd = 0;
		if(hour > 60){
			dd = dd + 1;
			hour = hour - 60;
		}
		if(mm == 1 || mm == 3 || mm == 5 || mm == 7 || mm == 8 || mm == 10 || mm == 12)
		{
			dd = 31;
		}else if(mm == 2){
			dd = 28;
		}else{
			dd = 30;
		}
		if(day > dd){
			mm = mm + 1;
			day = day - dd;
		}
		if(mm > 12){
			year = year + 1;
			mm = mm -12;
		}
	//	var newDate = new Date(year, mm, day, hour, minute, second, 0);
	//	2017-05-04 22:13:36
		var newDate = year+"-"+mm+"-"+day+" "+hour+":"+minute+":"+second;
		return newDate;
	}
	
	

exports.commentatorNotifier = functions.database.ref('/commentator_notifier/{pushId}')
    .onWrite(event => {
        // Grab the current value of what was written to the Realtime Database.
		var eventList = ['match1_stad', 'match2_stad', 'match_stad', 'test1_stad', 'test1_hp', 'test167_stad', 'testr137' ];
		const node = event.data.val();
		
    //    console.log('Notify', event.params.pushId, node.title);
		
		 const payload = {
                notification: {
                    title: 'Ting Tong',
                    sound: "default",
                    body: node.title
                } ,
				data:{
					eventID: node.eventID
				}
            };
		 
			var condi = node.eventID.substring(0, 5);
			var condition = "";
			for(var i = 0; i < eventList.length ; i++){
				if(eventList[i].indexOf(condi)!=-1){
					if(condition=="")
						condition = "'"+eventList[i]+"' in topics ";
					else
						condition =  condition + " || '"+eventList[i]+"' in topics";
				}
			}
			
	//		console.log("sent message condition "+condition);
			return admin.messaging().sendToCondition(condition, payload)
					  .then(function(response) {
						console.log("Success Response : "+response);
					  })
					  .catch(function(error) {
						console.log("Error sending message:", error);
					  });
				
	/*
        function subscribeTokenToTopic(token, topic) {
			console.log("SubscribeTokenToTopic Method Call....");
            fetch('https://iid.googleapis.com/iid/v1/'+token+'/rel/topics/'+topic, {
                method: 'POST',
                headers: new Headers({
                    'Authorization': 'key='+config.apiKey
                })
            }).then(response => {
                if (response.status < 200 || response.status >= 400) {
                throw 'Error subscribing to topic: '+response.status + ' - ' + response.text();
            }
            console.log('Subscribed to "'+topic+'"');
        }).catch(error => {
                console.error(error);
        })
        }  */
    });