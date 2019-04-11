const functions = require('firebase-functions');
const admin = require('firebase-admin');
const requestApi = require("request");


// Initialize Firebase
var config = {
    //Firebase configuration
  };
  admin.initializeApp(config);

exports.helloWorld = functions.https.onRequest((request, response) => {
    const firstName = request.query["first name"];
    var talks = parseInt(request.query.talks)

    talks += 1;
    response.json({
        "messages": [
            {
                "text": `Hello from Firebase! ${firstName} já conversamos ${talks} vezes!`
            }
        ],
        "set_attributes":{
            "talks": talks
        },
        "redirect_to_blocks":[
            "bye"
        ]
    });

});

exports.getFullOrder = functions.https.onRequest((request, response) => {
    
    // User variables
    const userId = request.query["messenger user id"]
    const firstName = request.query["first name"];
    const lastName = request.query["last name"];
    const coffeeType = request.query["coffee type"];
    const coffeeQtd = request.query["coffee qtd"];
    const coffeeSize = request.query["coffee size"];
    const coffeeSugar = request.query["coffee sugar"];
    const foodRequest = request.query["food"];
    const timezone = request.query["timezone"];
    
    // get time from order
    const timezoneDiff = timezone * 1000 * 3600;
    const time = Date.now() + timezoneDiff;
    var data = new Date(time);
    console.log(`Hora do pedido: ${data.getDate()}/${data.getMonth()+1}/${data.getFullYear()} - ${data.getHours()}:${data.getMinutes()}:${data.getSeconds()}`);

    // Referência do Banco de Dados
    const orderRef = admin.database().ref('/pendingOrders');
    
    const orderFail = {
        "messages": [
            {
                "text": `Seu pedido não pode ser concluido. Por favor tente novamente.`
            }
        ],
        "redirect_to_blocks": [
            "Order Review (General)"
        ]
    }

    const order = {
            orderTime: `${data.getDate()}/${data.getMonth()+1}/${data.getFullYear()} - ${data.getHours()}:${data.getMinutes()}:${data.getSeconds()}`,
            coffeeType: coffeeType,
            coffeeSize: coffeeSize,
            coffeeSugar: coffeeSugar,
            coffeeQtd: coffeeQtd,
            foodRequest: foodRequest,
            name: `${firstName} ${lastName}`,
            userId: userId
        }
    var orderList = [];
    const updateOrderList = orderList =>{
        orderRef.set(orderList).then(() => {
            console.log(`Pedido feito com sucesso. Usuário: ${userId}`);
            return response.json({
                "messages": [
                    {
                        "text": "Seu pedido foi feito com sucesso"
                    }
                ]
            })
        }).catch(error => {
            console.error(new Error(`Pedido não concluido. Motivo: ${error}`));
            response.json(orderFail)
        })
    };

    orderRef.once('value').then(snapshot => {
        const doc = snapshot.val();
        if (doc === null || doc === undefined) {
            console.log('No such document!');
            var newOrderList = [order]
            updateOrderList(newOrderList)
        } else {
            console.log('Document data:', doc);
            orderList = doc
            orderList.push(order)
            updateOrderList(orderList)
        }
            return;
        })
    .catch(err => {
        console.error('Error getting document', err);
        response.json(orderFail)
    });     

});

exports.getNextEvent = functions.https.onRequest((request, response) => {


    var options = { method: 'GET',
    url: 'https://api.meetup.com/GDG-Brasilia/events' };

    requestApi(options, (error, resp, bodyUmp) => {
    if (error){
        console.error(new Error(error));
        response.json({
            "messages": [
                {
                    "text": "Não consegui trazer os eventos do GDG. Tente novamente em alguns instantes por favor."
                }
            ],
            "redirect_to_blocks": [
                "MAIN MENU"
            ]
        })
    }else {
        console.log(resp);
        var body = JSON.parse(bodyUmp)
        console.log(body);
        console.log(body[0]);
        console.log(body[0].local_date);
        console.log(body[0].local_time);
        console.log(body[0].rsvp_limit);
        console.log(body[0].name);

        
    // handle success

    if (body[0] === undefined){
        response.json({
            "messages": [
                {
                    "text": "Nenhum meetup marcado."
                }
            ]
        })
    }
        return response.json({
            "messages": [
            {
                "text": "Veja nosso próximo evento:"
            }
            ],
            "set_attributes": {
                "event name": `${body[0].name}`,
                "event capacity": body[0].rsvp_limit,
                "event date": body[0].local_date,
                "event time": body[0].local_time,
                "event place address": body[0].venue.address_1,
                "event place name": body[0].venue.name,
                "event link": body[0].link,
                "event seats": (60 - body[0].yes_rsvp_count)
            }
            })        
        }

    })

});

exports.kitchen = functions.https.onRequest((request, response) => {
    
    // User variables
    const timezone = request.query["timezone"];
    
    // get time from order
    const timezoneDiff = timezone * 1000 * 3600;
    const time = Date.now() + timezoneDiff;
    var data = new Date(time);
 
    // Referência do Banco de Dados
    const orderRef = admin.database().ref('/pendingOrders');
    const fufilledOrderRef = admin.database().ref(`/fufilledOrders/${data.getDate()}${data.getMonth()+1}${data.getFullYear()}`);
    
    const noOrder = {
        "messages": [
            {
                "text": `Nenhum pedido efetuado ainda. Por favor volte daqui a pouco.`
            }
        ],
        "redirect_to_blocks": [
            "kitchen"
        ]
    }

    const updateFail = {
        "messages": [
            {
                "text": `Não consegui preparar o pedido. Por favor tente novamente.`
            }
        ],
        "redirect_to_blocks": [
            "kitchen"
        ]
    }

    // Logic 
    const backToClient = (firstOrder) => {

        var options = { method: 'POST',
        url: `https://api.chatfuel.com/bots/5bc0b5210ecd9f64d518d308/users/${firstOrder[0].userId}/send`,
        qs: 
        { chatfuel_token: 'qwYLsCSz8hk4ytd6CPKP4C0oalstMnGdpDjF8YFHPHCieKNc0AfrnjVs91fGuH74',
            chatfuel_block_id: '5bc4e4300ecd9f616a5cad23' } };

        requestApi(options, (error, resp, body) => {
            if (error) {
                console.error(new Error(error));
                response.json({
                    "messages": [
                        {
                            "text": "Pedido Não preparado com sucesso."
                        }
                    ]
                })
            } else {
                console.log(body);
                return response.json({
                    "messages": [
                        {
                            "text": "Pedido preparado com sucesso."
                        }
                    ]
                })
            }

        });
    } 

    const updateFuffiledOrderList = (orderList, firstOrder) => {
        fufilledOrderRef.set(orderList).then(() => {
            console.log(`Pedido preparado com sucesso: Cliente: ${firstOrder[0].userId}`);
            return backToClient(firstOrder)
        }).catch(error => {
            console.error(new Error(`Pedido não concluido. Motivo: ${error}`));
            response.json(updateFail)
        })
        
    }

    const getFufilledOrderList = (firstOrder) => {
        fufilledOrderRef.once('value').then(snapshot => {
            const doc = snapshot.val();
            if (doc === null || doc === undefined) {
                console.log('Nenhuma ordem executada!');
                let orderList = firstOrder
                updateFuffiledOrderList(orderList, firstOrder)
            } else {
                console.log('Fuffilled List:', doc);
                let orderList = doc;
                orderList.push(firstOrder[0])
                console.log('orderList: ', orderList);
                updateFuffiledOrderList(orderList, firstOrder)
            }
                return;
            })
        .catch(err => {
            console.error('Error getting document', err);
            response.json(updateFail)
        }); 
    }

    const updateOrderList = (orderList, firstOrder) => {
        orderRef.set(orderList).then(() => {
            console.log(`Pedido retirado de pending: Cliente: ${firstOrder[0].userId}`);
            return getFufilledOrderList(firstOrder)
        }).catch(error => {
            console.error(new Error(`Pedido não concluido. Motivo: ${error}`));
            response.json(orderFail)
        })
        
    }

    const getFirstOrder = () => {
        orderRef.once('value').then(snapshot => {
            const doc = snapshot.val();
            if (doc === null || doc === undefined) {
                console.log('Nenhum pedido!');
                response.json(noOrder)
            } else {
                console.log('Document data:', doc);
                let orderList = doc;
                const firstOrder = orderList.splice(0, 1);
                console.log('firstOrder: ', firstOrder);
                updateOrderList(orderList, firstOrder)
            }
                return;
            })
        .catch(err => {
            console.error('Error getting document', err);
            response.json(updateFail)
        });
    }

    getFirstOrder()


});

