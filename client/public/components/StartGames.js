import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container } from "./template/Container";
import { GameEntry } from "./GameEntry";
import { useNavigate } from "react-router-dom";
import "../style/template/modal.sass"

export const StartGames = () => {
  const navigate = useNavigate();
  let startGamesArray = [];
  const [data, setData] = useState();
  useEffect(() => {
    axios
      .get("/getStartGames")
      .then((res) => {
        let startGamesData = res.data.pushData;
        startGamesData.forEach((startGame) => {
          startGamesArray.push(
            <GameEntry
              key={startGame._id}
              index={startGame._id}
              title={`Game ${startGame._id}`}
              day={`Day ${startGame.playerState.day}`}
              player1={{
                name: startGame.playerState.orangeStar.username, // change to player1 in the future
                color: startGame.playerState.orangeStar.color, // change to color in NameBanner
                character: startGame.playerState.orangeStar.CO,
              }}
              player2={{
                name: startGame.playerState.blueMoon.username, // change to player1 in the future
                color: startGame.playerState.blueMoon.color, // change to color in NameBanner
                character: startGame.playerState.blueMoon.CO,
              }}
              map={startGame.mapData.mapName}
              time="Unlimited"
              startDate={` ${startGame.startDate}`}
              ruleSet="Standard"
            />
          );
        });
        setData(startGamesArray);
      })
      .catch((e) => {
        console.error(e);
        navigate("/login");
      });
  }, []);

  // Modal
  const [modal, setModal] = useState(false);

  return (
    <>
      {/* <div className="myModal">yo</div> */}
      <Container title="Pending Games">
        {/* <GameEntry
        title="This is the title!!!"
        day="This is the Day of the game"
        player1={{
          name: "Player1's name",
          CO: "blue",
          character: "max",
        }}
        player2={{
          name: "Player2's name",
          CO: "orange",
          character: "sami",
        }}
        map="Map name here"
        time="99:99:99 until Clock Expires"
        startDate="04/20/1969"
        ruleSet="RULE SET HERE IDK"
      /> */}
        {data}
      </Container>
    </>
  );
};
