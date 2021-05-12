const express = require('express')
const {WebhookClient} = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";

const baseUrl = 'https://mysqlcs639.cs.wisc.edu';
const fallbacks = ['what do you mean?', 'I don\'t understand', 'sure', 'You are right.']

async function fetchApi(path, method = 'GET', params) {
    const request = {
        method,
        headers: {
            'Content-Type': 'application/json',
            "x-access-token": token
        },
        redirect: 'follow'
    }
    if (params) {
        request.body = JSON.stringify(params);
    }
    try {
        let data = await fetch(baseUrl + path, request);
        const serverResponse = await data.json()

        console.log(serverResponse, '=====fetchAPi')
        return serverResponse;
    } catch (e) {
        console.error(e)
    }
}

async function getToken() {
    let request = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + base64.encode(username + ':' + password)
        },
        redirect: 'follow'
    }

    const serverReturn = await fetch('https://mysqlcs639.cs.wisc.edu/login', request)
    const serverResponse = await serverReturn.json()
    token = serverResponse.token

    console.log(token, '========token');
    return token;
}

app.get('/', (req, res) => res.send('online999'))
app.post('/', express.json(), (req, res) => {
    const agent = new WebhookClient({request: req, response: res})

    function welcome() {
        console.log(agent.query, agent.parameters, '==== agent.parameters')
        agent.add('Webhook works!')
    }

    async function login() {
        console.log(agent.parameters, agent.query, '===')
        // You need to set this from `username` entity that you declare in DialogFlow
        username = agent.parameters.username;
        // You need to set this from password entity that you declare in DialogFlow
        password = agent.parameters.password;

        agent.add('loading...');
        await getToken();

        await clearUserMessage();
        await addMessage(agent.query, true);
        await addMessage('You have signed in successfully,' + username);

        agent.add(token)
    }

    async function query() {
        console.log(agent.parameters, agent.query, '===query')
        const QueryType = agent.parameters.QueryType;
        agent.add('querying...');

        let p;
        switch (QueryType) {
            case 'Categories':
                p = getCategories();
                break;
            case 'Tags':
                p = getTags();
                break;
            case 'Cart':
                p = getCart();
                break;
            case 'Product':
                p = getProduct();
                break;
            default:
                p = Promise.resolve()
        }
        const data = await p;
        agent.add('get ' + QueryType + ' successful!');
        return data;
    }

    async function actions() {
        console.log(agent.parameters, agent.query, '===query')
        const Actions = agent.parameters.Actions;
        agent.add('querying...');

        let p;
        switch (Actions) {
            case 'Tags':
                p = actionTags();
                break;
            case 'Tags Stop':
                p = actionTagsStop();
                break;
            case 'Cart Add':
                p = actionCartAdd();
                break;
            case 'Cart Remove':
                p = actionCartRemove();
                break;
            case 'Cart Confirm Review':
                p = actionCartConfirmReview();
                break;
            case 'Cart Confirm Yes':
                p = actionCartConfirmYes();
                break;
            case 'Cart Confirm No':
                p = goBack();
                break;
            default:
                p = Promise.resolve()
        }
        const data = await p;
        agent.add('action ' + Actions + ' successful!');
        return data;
    }

    const savePage = async (url) => {
        await fetchApi(
            '/application', 'PUT', {page: url})
        agent.add("Save the page")
    }

    const actionCartConfirmYes = async () => {

    }

    const goBack = async () => {
        await fetch(
            '/application', 'PUT', {back: true})
        addMessage("Return back.")
    }

    const actionCartConfirmReview = async () => {
        await savePage("/" + username + "/cart-review");
        await addMessage("Here is your cart.")
        agent.add("Getting cart info")
    }
    const getProductId = async () => {
        const pagePaths = await getPagePath();
        const pathLen = pagePaths.length;
        let pId = -1;
        if (pathLen === 4) {
            pId = pagePaths[3];
        } else {
            let url = '/products/?';
            const tags = await fetchApi('/application/tags')
            if (tags.tags.length !== 0) {
                url += "tags=" + tags.tags.join(',');
            }
            if (pagePaths.length === 2 && pagePaths[1] !== 'cart') {
                url += "&category=" + pagePaths[1];
            }

            let products = await fetchApi(url);

            if (products.length > 0) {
                pId = products.products[0].id
            }
        }
        return pId;
    }

    const actionCartAdd = async () => {
        await addMessage(agent.query, true)

        let pId = await getProductId();
        let number = agent.parameters.itemNumber || 1;
        let route = '/application/products/' + pId

        for (let i = 0; i < number; i++) {
            await fetchApi(route, 'POST');
        }

        await addMessage("add" + number + " items to cart")
    }

    const actionCartRemove = async () => {
        await addMessage(agent.query, true)

        let cart = await fetchApi('/application/products')
        if (cart.products && cart.products.length > 0) {
            let product = cart.products[cart.products.length - 1]
            let pId = product.id
            let number = agent.parameters.itemNumber ? Math.min(agent.parameters.itemNumber, product.count) : product.count

            console.log(22222, number)
            for (let i = 0; i < number; i++) {
                await fetchApi('/products/' + pId, 'DELETE')
            }

            agent.add("Removing from cart")
        } else {
            await addMessage('there is not any product in your cart.')
        }

    }
    const actionTagsStop = async () => {
        await addMessage(agent.query, true)

        await clearTags()
        await addMessage("I am no longer filtering by tags")
        agent.add("all tags have been cleared")
    }
    const actionTags = async () => {
        await addMessage(agent.query, true)

        await clearTags()
        await Promise.all((agent.parameters.Tags && agent.parameters.Tags.split(',') || []).map(tag => fetchApi('/application/tags/'
            + tag.toLowerCase(), 'POST')));

        let pagePath = await getPagePath()
        if (pagePath.length !== 2) {
            await addMessage("I've  filtered by tags. I can only show you a " +
                "list of products on a specific category page. Should I navigate to one?")
        } else (
            await addMessage("Ok. I'm filtering by " + agent.parameters.Tags)
        )
        agent.add("Filtering")
    }

    const clearTags = async () => {
        await fetchApi('/application/tags', 'DELETE');
        agent.add('all tags are cleared');
    }

    const getCategories = async () => {
        const data = await fetchApi('/categories');
        const msg = `All categories has been show: ${data.categories.join(',')}`
        await addMessage(msg)
    };
    const getPagePath = async () => {
        let path = '';
        const data = await fetchApi('/application');
        const page = data.page;
        const pagePaths = page.split('/');
        pagePaths.shift();
        return pagePaths;
    }
    const getTags = async () => {
        let path = '';
        const pagePaths = await getPagePath();
        const pathLen = pagePaths.length;
        if (pathLen === 1) {
            path = '/tags'
        } else if (pathLen === 2) {
            path = `/categories/${pagePaths[1]}/tags`
        } else if (pathLen === 4) {
            path = `/products/${pagePaths[3]}/tags`
        }
        console.log(path, '====tags path');
        await addMessage(agent.query, true)

        const res = await fetchApi(path);
        const msg = `${path.slice(1).split('/').join(' ')} has been show: ${res.tags.join(',')}`
        await addMessage(msg)
    };
    const getCart = async () => {
        await addMessage(agent.query, true)
        const res = await fetchApi('/application/products')
        const products = res.products;
        if (products.length === 0) {
            await addMessage('Your cart is empty.');
            return;
        }
        const totalMoney = products.reduce((total, p) => {
            total += p.price * p.count;
            return total;
        }, 0);
        const totalItems = products.reduce((total, p) => {
            total += p.count;
            return total;
        }, 0);
        const types = [...new Set(products.map(p => p.category))];
        let message = "There are " + totalItems + " items in your cart," + "You have " + types.join(',') + "in your cart," + " which have cost " + totalMoney + " dollars."
        await addMessage(message);
    };
    const getProduct = async () => {
        await addMessage(agent.query, true)
        let pId = await getProductId();

        const [info, tags, reviews] = await Promise.all([fetchApi('/products/' + pId), fetchApi('/products/' + pId + '/tags'), fetchApi('/products/' + pId + '/reviews')])

        let message = ''
        message += "The " + info.name + " is " + info.price + " dollars."
        message += "It's type is " + info.category + "."
        if (tags.tags && tags.tags.length > 0) {
            message = "It's tags include: " + tags.tags.join(",") + ". "
        } else {
            message = "This product doesn't have any tags."
        }
        if (reviews.reviews && reviews.reviews.length > 0) {
            const averageStars = reviews.reviews.reduce((total, r) => {
                total += r.stars;
                return total;
            }, 0) / reviews.reviews.length;
            message = "It has " + reviews.reviews.length + " reviews and it's average star is " + averageStars + "."
        } else {
            message = message.concat("This product doesn't have any reviews.")
        }

        await addMessage(message)
    }
    const clearUserMessage = async () => fetchApi('/application/messages', 'DELETE')
    const addMessage = async (text, isUser) => {
        const data = {
            text,
            date: new Date(),
            isUser
        }
        agent.add(text);
        const res = await fetchApi('/application/messages', 'POST', data)
        console.log(res, '=====message')
    }

    async function toPage() {
        await addMessage(agent.query, true)
        const pages = {
            Home: "/" + username,
            Welcome: "/",
            Cart: "/" + username + "/cart",
            Review: "/" + username + "/cart-review",
            Confirm: "/" + username + "/cart-confirmed",
            "Sign Up": "/signUp",
            "Sign In": "/signIn"
        }
        let page = pages[agent.parameters.Pages] || pages.Home;

        await savePage(page)

        await addMessage('I get the page what you are looking for.')
        agent.add("Finding the page")
    }

    async function toCategoryPage() {
        await addMessage(agent.query, true)
        let category = agent.parameters.Category;
        let Index = agent.parameters.Index;

        if (Index !== undefined) {
            await savePage("/" + username + "/" + category + '/products/' + Index);
            await addMessage('You will go to the ' + category + ' detail page with productId=' + Index + '.')
        } else {
            await savePage("/" + username + "/" + category)
            await addMessage('You will go to the ' + category + ' page.')
        }
    }

    async function fallback() {
        const word = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        agent.add(word)
    }


    let intentMap = new Map()
    intentMap.set('Default Welcome Intent', welcome)
    // You will need to declare this `Login` content in DialogFlow to make this work
    intentMap.set('Login', login)
    intentMap.set('Query', query)
    intentMap.set('Actions', actions)
    intentMap.set('ToPage', toPage)
    intentMap.set('ToCategoryPage', toCategoryPage)
    intentMap.set(null, fallback)
    agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
