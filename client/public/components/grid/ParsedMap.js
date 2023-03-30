import React, {useEffect, useState} from "react";
import {pathFinding} from "./gameLogic/pathfinding"
import {moveUnit} from "./gameLogic/moveUnit"
import {socketFunction} from "./gameLogic/websocket"
import '../../App.sass'
import axios from "axios";
import io from "socket.io-client"
import {unitType} from "./gameLogic/unitType";
import {findTargets} from "./gameLogic/validTargets";
import {damageCalculator} from "./gameLogic/damageCalculator";

const socket = io.connect("http://localhost:4000")

let countriesOrder = ['orangeStar', 'blueMoon']
let gameState = []
let playerState = {}

let mapTiles = []

export function ParsedMap() {
    let [map, setMap] = useState([])
    let [players, setPlayers] = useState({
        turn: 0, day: 1,
            orangeStar: {
                _id: 1, username: 'Javi',

                economy: {
                    unitCount: 0, properties: 3, funding: 0,
                }
            }, blueMoon: {
                _id: 2, username: 'Asa', economy: {
                    unitCount: 0, properties: 3, funding: 0,
                }
            }

    })

//lets change a specific tile and its elements
    function changeTile(index, instruction) {
        let {tileUnit, tileSquare, showMenu, hp, capture, hpTile, useFunction} = instruction
        hpTile = hpTile ? hpTile : index;
        if (hpTile !== index) console.log("not the same")

        if (!hp && gameState[hpTile].tileUnit.hp <= 100) {
            let hpNumber = gameState[hpTile].tileUnit.hp / 10
            hp = <div className={`HP${Math.ceil(hpNumber)}Icon`}></div>
        }
        if (gameState[index].tileUnit.capture === true) {
            capture = <div className={`captureIcon`}></div>
        }
        mapTiles[index] = <div id={index} key={index} onClick={useFunction}
                               className={gameState[index].tileUnit.isUsed ? 'mapTile stateUsed' : `mapTile`}>
            <div className={`tileTerrain ${gameState[index].terrainImage}`}></div>
            {tileUnit}
            {tileSquare}
            {showMenu}
            {hp}
            {capture}
            <div className="tileCursor"></div>
        </div>
    }

// this function will request our server for a json file, read it and create tiles depending on the json file information
    useEffect(() => {
        axios.get('/getGameState')
            .then(res => {
                playerState = res.data.playerState
                gameState = res.data.gameState
                res.data.gameState.forEach((tile, index) => {
                    changeTile(index, {
                        tileUnit: res.data.gameState[index].tileUnit ? <div
                            className={res.data.gameState[index].tileUnit.country + res.data.gameState[index].tileUnit.name + " tileUnit"}></div> : null,
                        tileSquare: null,
                        showMenu: null,
                        useFunction: () => {
                            checkActions(index)
                        }
                    })
                })
                setMap(mapTiles)
                setPlayers(playerState)
            }).catch(e => console.log(e));
    }, [])

    //we listen for actions being sent
    socket.on("receiveAction", data => {

    })

//function used to resetGrid to original state
    function resetGrid() {
        let resetMap;
        // lets reset the map, to make sure we don't grab any other MoveTile divs with us
        gameState.forEach((tile, index) => {
            changeTile(index, {
                tileUnit: gameState[index].tileUnit ? <div
                    className={gameState[index].tileUnit.country + gameState[index].tileUnit.name + " tileUnit"}></div> : null,
                tileSquare: null,
                showMenu: null,
                useFunction: () => {
                    checkActions(index)
                }
            })
        })
        resetMap = mapTiles.slice()
        setMap(resetMap)
    }

    //Everytime a tile is clicked, we go through these steps
    function checkActions(index) {
        //TODO: Instead of calling gameState[initialTile] or gamestate[newTile] like 100 times, lets put that into a variable to make our code much more compact
        resetGrid()
        if (gameState[index].tileUnit !== false) {
            //show pathfinding options
            checkPath(index)
        } else if (gameState[index].terrainType === "property") {
            //move to building menu actions function
            showMenu(index, index, false)

        }
    }

    //function used to render our blue squares and see what our available movements are
    function checkPath(initialTile) {
        let newMap;
        // lets call our function that can calculate the possible tiles we can take
        let blueTiles = pathFinding(18, 18, gameState[initialTile], initialTile, gameState, mapTiles)
        // lets use the return value from our pathFinding function (pathFinding), which is an array with the index of the tiles that we can move to
        blueTiles.tilesToDraw.forEach((tile) => {

            let tileMove = <div className="tileMove"></div>
            if (tile.hasEnemy) tileMove = <div className="tileEnemy"></div>

            changeTile(tile.index, {
                tileUnit: gameState[tile.index].tileUnit ? <div
                    className={gameState[tile.index].tileUnit.country + gameState[tile.index].tileUnit.name + " tileUnit"}></div> : null,
                tileSquare: tileMove,
                showMenu: null,
                useFunction: () => {
                    newPosition(blueTiles, tile.index, initialTile)
                }
            })
        })
        // react needs to be tricked in order to re-render for some reason? Will not re-render mapTiles despite it being different
        //TODO: Can we take out this little .slice() trick and make react just re-render normally?
        newMap = mapTiles.slice()
        setMap(newMap)
    }

    //used to calculate the new position of the unit
    function newPosition(movementArray, targetTile, initialTile,) {
        if (gameState[initialTile].tileUnit.isUsed) return undefined;
        let shortestPath = moveUnit(movementArray, targetTile);
        //lets make sure user doesnt put unit on top of another unit (but if able to put the unit on the same spot as well)
        if (gameState[targetTile].tileUnit !== false && shortestPath.length !== 1) {
            checkPath(checkActions(targetTile))
        } else {
            //lets see what the shortest path is
            let newTile;
            if (shortestPath.length <= 1) {
                newTile = shortestPath[0]
            } else newTile = shortestPath[shortestPath.length - 1];
            //if the unit moves to the same tile it was already in, we don't need to do anything
            if (newTile !== initialTile) {
                // TODO: these movements should go from path[0] (initial tile) to path[path.length -1] (newTile) by moving a tile at a time instead of jumping from start to end (so 0,1,2,3...) because the unit moves through the terrain, it doesnt just teleport to its target location.
                //lets delete/set the unit in the initial tile
                changeTile(initialTile, {
                    tileUnit: null, tileSquare: <div className="tileMove"></div>, showMenu: null, //we put hp as true so it doesnt appear
                    hp: true, capture: null, useFunction: () => {
                        checkPath(initialTile)
                    }
                })
            }
            showMenu(initialTile, newTile, true)
        }
    }

    async function showMenu(initialTile, newTile, isUnit) {
        let tileMenu = [];
        let showBlueTile;

        let {day, turn, players} = playerState
        //if (countriesOrder[turn] !== players[turn].country) return null

        /*
        TODO:
            -Check if unit clicked shares turn number (so OS is 1, BM is 2), if it doesnt match, then break function since it is not the turn of that player and therefore they cannot move that
            ADDITIONALLY
                check the username, only the target username should be able to move! Maybe we need to change our value of turn to the username that is going to play the next
         */
        //lets check if its a unit
        if (await isUnit !== false) {
            //lets check all the validTargets unit can attack and render them
            let validTargets = findTargets(newTile, gameState[initialTile].tileUnit, gameState)
            if (validTargets.length > 0) {
                tileMenu.push(<div className="menuName"
                                   onClick={() => attackAction(initialTile, newTile)}>Attack</div>)

                validTargets.forEach(tile => {
                    changeTile(tile, {
                        tileUnit: <div
                            className={gameState[tile].tileUnit.country + gameState[tile].tileUnit.name + " tileUnit"}></div>,
                        tileSquare: <div className="tileAttack"></div>,
                        showMenu: false,
                        capture: gameState[tile].tileUnit.capture, //lets put a confirm Attack option here
                        useFunction: () => {
                            confirmAction(initialTile, newTile, confirmAttack(initialTile, newTile, tile, {
                                unit: gameState[initialTile].tileUnit, terrain: gameState[newTile].terrainType,
                            }, {
                                unit: gameState[tile].tileUnit, terrain: gameState[tile].terrainType,
                            }))
                        }
                    })
                })
            }
            showBlueTile = <div className="tileMove"></div>
            tileMenu.push(<div className="menuName"
                               onClick={() => confirmAction(initialTile, newTile, moveAction(initialTile, newTile))}>Wait</div>)
            //if its an infantry and also on a property
            if (gameState[initialTile].tileUnit.id === 0 || gameState[initialTile].tileUnit.id === 1) {
                if (gameState[newTile].terrainType === "property" && gameState[newTile].terrainOwner !== gameState[initialTile].tileUnit.country) {
                    tileMenu.push(<div className="menuName"
                                       onClick={() => confirmAction(initialTile, newTile, captureAction(initialTile, newTile))}>Capture</div>)
                }
            }
            //lets cheeck if its a factory/base
        } else if (await gameState[initialTile].terrainImage.slice(2, 3) === "2") {
            //lets get the array with all the units
            const unitsToBuild = unitType(0, true)
            //lets stablish if we display orangeStar or blueMoon units
            const ownerShip = gameState[initialTile].terrainOwner
            //lets make an array with each unit, display its information and a function to confirm the actrion

            //TODO: Check which units are below our funds atm, allow those to be built and the rest grey out (maybe strike a line in the text too?)
            unitsToBuild.forEach((unit, id) => {
                tileMenu.push(<div className="menuOptions"
                                   onClick={() => confirmAction(initialTile, newTile, buildAction(initialTile, {
                                       ownerShip: ownerShip, unit: unit, id: id
                                   }))}>
                    <div className={`menu${ownerShip}${unit.menuName}`}></div>
                    <div className={`menuName`}> {unit.menuName}</div>
                    <div className={`menuCost`}> {unit.cost}</div>
                </div>)
            })
        }
        tileMenu = <div className="tileMenu">
            {tileMenu}
        </div>
        changeTile(newTile, {
            tileUnit: <div
                className={gameState[initialTile].tileUnit.country + gameState[initialTile].tileUnit.name + " tileUnit"}></div>,
            tileSquare: showBlueTile,
            showMenu: tileMenu,
            capture: null,
            hpTile: initialTile,
            useFunction: null
        })
        setMap(mapTiles)
    }

    function confirmAction(initialTile, newTile, functionToRun) {
        //We run the command depending on what it was meant to be
        functionToRun
        resetGrid()
    }

    function confirmAttack(initialTile, newTile, attackedTile, atk, def) {
        let results = damageCalculator(atk, def)
        console.log(results)
        gameState[initialTile].tileUnit.hp = results.atkHP
        gameState[attackedTile].tileUnit.hp = results.defHP
        if (results.atkHP <= 0) gameState[initialTile].tileUnit = false
        if (results.defHP <= 0) gameState[attackedTile].tileUnit = false

        moveAction(initialTile, newTile)
    }

    // ACTION FUNCTIONS

    function moveAction(initialTile, newTile) {
        //lets update our local copy of mapdata (instead of issuing a new get request everytime we move, we just update the local variable)
        if (initialTile !== newTile) {
            gameState[initialTile].terrainCapture = 0
            gameState[newTile].tileUnit = gameState[initialTile]?.tileUnit
            gameState[initialTile].tileUnit = false
            // if the unit moves to a tile with 0 capture, then they lose the capture icon
            if (gameState[newTile].terrainCapture === 0 && gameState[newTile]?.tileUnit) gameState[newTile].tileUnit.capture = null
        }
        if (gameState[newTile].tileUnit) gameState[newTile].tileUnit.isUsed = true
    }

    function captureAction(initialTile, newTile) {
        let countryTags = {orangeStar: "os", blueMoon: "bm"}
        let currentCapture = gameState[newTile].terrainCapture
        let currentHP = Math.ceil(gameState[initialTile].tileUnit.hp / 10)
        gameState[newTile].terrainCapture = currentCapture + currentHP
        gameState[initialTile].tileUnit.capture = true
        //we can actually capture it
        if (gameState[newTile].terrainCapture >= 20) {
            // The property has an owner? (not false), then we reduce their funding by 1k
            if (gameState[newTile].terrainOwner) {
                playerState[gameState[newTile].ownerShip].funding -= 1000
            }
            gameState[newTile].terrainOwner = gameState[newTile].tileUnit.country
            gameState[newTile].terrainImage = countryTags[gameState[newTile].tileUnit.country] + gameState[newTile].terrainImage.slice(2, 3)
            gameState[initialTile].tileUnit.capture = false
            console.log( playerState[gameState[initialTile].tileUnit.country].funding)
            console.log(gameState[initialTile].tileUnit.country)
            playerState[gameState[initialTile].tileUnit.country].funding += 1000
            setPlayers(playerState)
            console.log(playerState[gameState[initialTile].tileUnit.country].funding)
            //TODO: Increase the income received by 1000 or decrease if allied building was captured


        }
        moveAction(initialTile, newTile)


    }

    function buildAction(initialTile, data) {


        //we update the new unit in has tile with the correct information
        gameState[initialTile].tileUnit = {
            id: data.id, name: data.unit.menuName, country: data.ownerShip, hp: 100, isUsed: true, capture: null
        }

        changeTile(initialTile, {
            tileUnit: <div className={`${data.ownerShip + data.unit.menuName + " tileUnit"}`}></div>,
            tileSquare: null,
            showMenu: null,
            useFunction: () => {
                checkPath(initialTile)
            }
        })
    }

    function attackAction(initialTile, newTile) {
        console.log('attacking!')
        changeTile(newTile, {
            tileUnit: <div
                className={`${gameState[initialTile].tileUnit.country + gameState[initialTile].tileUnit.name}  tileUnit`}></div>,
            tileSquare: <div className="tileMove"></div>,
            hpTile: initialTile,
            showMenu: null,
            useFunction: () => {
                checkPath(newTile)
            }
        })
        let newMap;
        newMap = mapTiles.slice()
        setMap(newMap)
    }


    function sendToDatabase(initialTile, newTile) {
        //lets send the move to the database so its saved
        axios.post('/moveUnit', {
            initialIndex: initialTile, newIndex: newTile, unit: gameState[initialTile].tileUnit
        }).then((response) => {

        }).catch(error => console.log(error));
    }

    function passTurn() {
        gameState.forEach(tile => {
            if (tile.tileUnit) tile.tileUnit.isUsed = false;
        });

        /*
        TODO:
            Pass turn
                -Up day counter by one
                - Check whether day is 1 or 2
                    - Increase funding of player[day] * their income

         */

        /*

         */

        resetGrid()
    }


    return (<div>
        <div className="gameBox">
            <h1>Caustic Finale</h1>
            <h1> Day: 1</h1>
            <div className="playerBoxGrid">
                <div className="playerBox">
                    <h2>{players[countriesOrder[0]]?.username}</h2>
                    <p>Unit Count: {players[countriesOrder[0]]?.economy.unitCount}</p>
                    <p>Income: {players[countriesOrder[0]]?.economy.properties * 1000}</p>
                    <p>Funding: {players[countriesOrder[0]]?.economy.unitCount}</p>
                </div>
                <div className="playerBox">
                    <h2>{players[countriesOrder[1]]?.username}</h2>
                    <p>Unit Count: {players[countriesOrder[1]]?.economy.unitCount}</p>
                    <p>Income: {players[countriesOrder[1]]?.economy.properties * 1000}</p>
                    <p>Funding: {players[countriesOrder[1]]?.economy.unitCount}</p>
                </div>
                <div className="playerBox">
                    <button onClick={passTurn}> Pass Turn</button>
                </div>

            </div>

            <br/>

            <div className={`gridSize18 mapGrid`}>
                {map}
            </div>
        </div>
    </div>)

}

