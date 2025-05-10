//globala variabler
let usedNumbers = new Set(); // Håller koll på vilka nummer som redan använts
let gameInProgress = false; // Om spelet är igång eller inte
let totalPoints = 0;  //Totalpoäng under flera spel
let totalGames = 0;   // Antal spelade omgångar
let currentTilesPlaced = 0; // Hur många brickor som placerats på spelplanen
let ghostTimer = null; // Timer för spökfunktionen
let ghostDelay = 40000; // Första spöket kommer efter 40 sekunder 

//Ladda poäng och spelräknare från cookie 
window.addEventListener("DOMContentLoaded", () => {

    // Läs in tidigare sparad poäng och antal spel
    let savedData = getCookie("gameStats");
    if (savedData) {
        let [points, games] = savedData.split("|").map(Number);
        totalPoints = points;
        totalGames = games;
        document.getElementById("totPoints").textContent = totalPoints;
        document.getElementById("countGames").textContent = totalGames;
    }

    initDropZones();
    document.getElementById("newGameBtn").addEventListener("click", startNewGame);   // Nytt spel
    document.getElementById("newTilesBtn").addEventListener("click", generateNewTiles);  // Nya brickor
    document.getElementById("newTilesBtn").disabled = true; // Inaktivera brick-knappen tills spelet startas
});

// Starta ett nytt spel 
function startNewGame() {
    gameInProgress = true;
    usedNumbers.clear();  // Töm tidigare använda nummer
    currentTilesPlaced = 0;
    ghostDelay = 40000; // Återställ spöktid vid nytt spel
    document.getElementById("message").textContent = "";
    document.getElementById("newGameBtn").disabled = true;
    document.getElementById("newTilesBtn").disabled = false;

    // Rensa spelplanen
    document.querySelectorAll("#board .tile").forEach(tile => {
        tile.textContent = "";
        tile.classList.remove("occupied", "ghostTile");
        tile.style.backgroundColor = "";
    });

    // Rensa markeringar (bock eller kryss)
    document.querySelectorAll(".mark").forEach(m => m.className = m.classList[0] + " " + m.classList[1]);

    // Rensa brickor
    document.querySelectorAll("#newTiles .tile").forEach(tile => {
        tile.textContent = "";
        tile.setAttribute("draggable", false);
    });

    generateNewTiles(); // Skapa fyra nya brickor direkt
    scheduleGhost(); // Starta spök-timern
}

// Generera nya brickor (max 4)
function generateNewTiles() {
    let tiles = document.querySelectorAll("#newTiles .tile");
    let newNumbers = [];

    // Skapa 4 unika nummer mellan 1 och 40
    while (newNumbers.length < 4 && usedNumbers.size < 40) {
        let rand = Math.floor(Math.random() * 40) + 1;
        if (!usedNumbers.has(rand)) {
            usedNumbers.add(rand);
            newNumbers.push(rand);
        }
    }

    // Placera numren på brickorna
    tiles.forEach((tile, i) => {
        tile.textContent = newNumbers[i] || "";
        if (newNumbers[i]) {
            tile.setAttribute("draggable", true); // Gör brickan dragbar
            tile.addEventListener("dragstart", handleDragStart);
        }
    });

    document.getElementById("newTilesBtn").disabled = true; // Inaktivera knappen tills alla är placerade
}

// När en bricka dras 
function handleDragStart(e) {
    e.dataTransfer.setData("text/plain", e.target.textContent); // Spara innehållet
    e.dataTransfer.effectAllowed = "move";
}

// Aktivera droppzoner på spelplanen
function initDropZones() {
    const boardTiles = document.querySelectorAll("#board .tile");

    boardTiles.forEach(tile => {
        tile.addEventListener("dragover", e => {
            if (!tile.textContent) {
                tile.style.backgroundColor = "lightgreen"; // Markera med grön färg när man drar över
                e.preventDefault(); // Tillåt drop
            }
        });

        tile.addEventListener("dragleave", () => {
            tile.style.backgroundColor = "";   // Återställ färg
        });

        tile.addEventListener("drop", e => {
            e.preventDefault();
            if (tile.textContent) return;  // Om redan upptagen, gör inget

            let number = e.dataTransfer.getData("text/plain");
            tile.textContent = number;
            tile.classList.add("occupied");
            tile.style.backgroundColor = "";
            currentTilesPlaced++;

            // Ta bort brickan som drogs
            const dragged = [...document.querySelectorAll("#newTiles .tile")].find(t => t.textContent == number);
            if (dragged) {
                dragged.textContent = "";
                dragged.setAttribute("draggable", false);
            }


            // Om alla fyra är placerade
            const remaining = [...document.querySelectorAll("#newTiles .tile")].filter(t => t.textContent !== "");
            if (remaining.length === 0) {
                if (document.querySelectorAll("#board .tile.occupied").length === 16) {
                    endGame();   // Spelet är klart
                } else {
                    document.getElementById("newTilesBtn").disabled = false;   // Tillåt nya brickor
                }
            }
        });
    });
}


//Avsluta spelet och räkna poäng 
function endGame() {
    let score = 0;

    // Kolla varje rad (klass s1 till s8)
    for (let i = 1; i <= 8; i++) {
        let tiles = document.querySelectorAll(`.s${i}`);
        let values = [...tiles].map(t => parseInt(t.textContent)).filter(n => !isNaN(n));
        let isIncreasing = values.every((v, i, arr) => i === 0 || v > arr[i - 1]);  // Ökande ordning?

        let mark = document.querySelector(`.mark.s${i}`);
        if (values.length === 4 && isIncreasing) {
            mark.classList.add("check");  // Grön bock
            score++;
        } else {
            mark.classList.add("cross"); // Rött kryss
        }
    }


    // Uppdatera statistik
    totalPoints += score;
    totalGames++;
    document.getElementById("message").textContent = `Du fick ${score} poäng!`;
    document.getElementById("totPoints").textContent = totalPoints;
    document.getElementById("countGames").textContent = totalGames;
    setCookie("gameStats", `${totalPoints}|${totalGames}`, 30); // Spara i cookie

    // Återställ knappar
    document.getElementById("newGameBtn").disabled = false;
    document.getElementById("newTilesBtn").disabled = true;

    clearTimeout(ghostTimer); // Stoppa spöket
}

// Starta en timer som kallar på spöket efter ghostDelay

function scheduleGhost() {
    if (!gameInProgress) return;

    ghostTimer = setTimeout(triggerGhost, ghostDelay);
}
// När spöket kommer
function triggerGhost() {
    if (!gameInProgress) return;

    let occupiedTiles = [...document.querySelectorAll("#board .tile.occupied")];
    if (occupiedTiles.length === 0) {
        scheduleGhost(); // Om det inte finns något att ta, vänta igen
        return;
    }

    // Välj upp till 4 brickor att ta bort
    let tilesToRemove = shuffleArray(occupiedTiles).slice(0, 4);
    tilesToRemove.forEach(tile => tile.classList.add("ghostTile")); // Lägg till visuell effekt

    // Visa spökbild
    document.getElementById("ghost").style.visibility = "visible";


    // Efter 2 sekunder, ta bort brickorna
    setTimeout(() => {
        tilesToRemove.forEach(tile => {
            let number = parseInt(tile.textContent);
            if (!isNaN(number)) {
                usedNumbers.delete(number); // Lägg tillbaks numret i tillgängliga
            }
            tile.textContent = "";
            tile.classList.remove("occupied", "ghostTile");
        });

        // Dölj spöket
        document.getElementById("ghost").style.visibility = "hidden";


        // Minska tiden till nästa spöke (minst 10 sekunder)
        ghostDelay = Math.max(10000, ghostDelay - 10000);


        // Starta ny timer om spelet inte är klart
        if (document.querySelectorAll("#board .tile.occupied").length < 16) {
            scheduleGhost();
        }
    }, 2000); // 2 sekunders innan brickor tas bort
}

// Blanda en array (för att slumpa brickor)
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}
