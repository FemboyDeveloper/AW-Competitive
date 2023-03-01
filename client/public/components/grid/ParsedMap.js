import React, {useEffect, useState} from "react";

import {pathFinding} from "./gameLogic/pathfinding"
import '../../App.sass'
import axios from "axios";


export function ParsedMap() {

// this function will request our server for a json file, read it and create tiles depending on the json file information
    let mapTiles = []
    let mapData = []
    let [map, setMap] = useState([])
    useEffect(() => {
        axios.get('/map/parsedMap')
            .then(res => {
                mapData = res.data
                res.data.forEach((tile, index) => {
                    //Ignore last one since that one has mapInformation and is not a mapTile
                    if (index !== res.data.length - 1) {
                        console.log(tile)
                        mapTiles.push(
                            <div onClick={() => {
                                checkPath(index)
                            }} key={index} className={`mapTile`} id={(index)}>
                                <div className={tile.terrainImage}></div>
                                <div className={tile.hasUnit.name}></div>
                                <div className="tileCursor"></div>
                            </div>
                        )
                    }
                })
                setMap(mapTiles)
            }).catch(e => {
            console.log(e)
        });
    }, [])

    function checkPath(index) {

        // lets call our function that can calculate the possible tiles we can take
        let findPath = pathFinding(18, 18, mapData[index], mapTiles[index].props.id, mapData, mapTiles)

        // lets reset the map, to make sure we don't grab any other MoveTile divs with us
        mapTiles.forEach((tile, index) => {
            mapTiles[index] = <div key={index} onClick={() => {
                checkPath(index)
            }} className={`mapTile`} id={index}>
                <div className={tile.props.children[0].props.className}></div>
                <div className={tile.props.children[1].props.className}></div>
                <div className="tileCursor"></div>
            </div>
        })

        // lets use the return value from our pathFinding function (findPath), which is an array with the index of the tiles that we can move to
        findPath.forEach((tile) => {
            mapTiles[tile.index] = <div key={tile.index} onClick={() => {
                checkPath(tile.index)
            }} className={`mapTile`} id={tile.index}>
                <div className={mapData[tile.index].terrainImage}></div>
                <div className={mapData[tile.index].hasUnit.name}></div>
                <div className="moveTile"></div>
                <div className="tileCursor"></div>
            </div>
        })

        //TODO: Can we take out this little .slice() trick and make react just re-render normally?

        // react needs to be tricked in order to re-render for some reason?
        let newMap = mapTiles.slice()
        setMap(newMap)


    }

    return (
        <div>
            <div className="gameBox">
                <h1>Caustic Finale</h1>
                <div className={`gridSize18 mapGrid`}>
                    {map}
                </div>
            </div>
        </div>
    )

}

