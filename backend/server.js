const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const wordsList = require("./words");

const ROUND_TIME = 60;

// Enhanced scoring system constants
const SCORING_CONFIG = {
  BASE_POINTS: 100,
  TIME_MULTIPLIER: 3, // Increased from 2 for more dramatic time rewards
  DIFFICULTY_MULTIPLIERS: {
    easy: 1.0,      // 3-4 letter words
    medium: 1.4,    // 5-6 letter words
    hard: 1.8,      // 7-8 letter words
    expert: 2.3,    // 9+ letter words
    compound: 2.8   // Words with special characters or compound words
  },
  SPEED_THRESHOLDS: {
    lightning: 10,  // Guessed within 10 seconds
    fast: 20,       // Guessed within 20 seconds
    quick: 35,      // Guessed within 35 seconds
    normal: 50      // Guessed within 50 seconds
  },
  SPEED_MULTIPLIERS: {
    lightning: 3.0,
    fast: 2.2,
    quick: 1.5,
    normal: 1.2,
    slow: 1.0
  },
  POSITION_BONUSES: {
    1: 100,   // First place bonus
    2: 60,    // Second place bonus
    3: 30,    // Third place bonus
    4: 15,    // Fourth place bonus
    5: 10     // Fifth place bonus
  },
  HOST_BASE_POINTS: 60,
  HOST_TIME_BONUS: 2.0,
  HOST_QUALITY_BONUS: 75, // Bonus for getting many players to guess quickly
  CONSECUTIVE_BONUS: 0.25, // 25% bonus per consecutive correct guess
  STREAK_THRESHOLDS: {
    small: 3,   // 3 consecutive rounds
    medium: 5,  // 5 consecutive rounds
    large: 8,   // 8 consecutive rounds
    epic: 12    // 12 consecutive rounds
  },
  STREAK_MULTIPLIERS: {
    small: 1.2,
    medium: 1.5,
    large: 2.0,
    epic: 3.0
  },
  ROUND_PROGRESSION_BONUS: 0.1, // 10% bonus per round completed
  PARTICIPATION_POINTS: 15,
  COMEBACK_BONUS: 50, // Bonus for guessing after being behind
  PERFECT_ROUND_BONUS: 200, // Bonus for host when everyone guesses correctly
  MIN_GUESS_INTERVAL: 2000, // Minimum 2 seconds between guesses to prevent spam
};

// Enhanced word difficulty categorization
const getWordDifficulty = (word) => {
  const length = word.length;
  const hasSpecialChars = /[^a-zA-Z]/.test(word);
  const isCompound = word.includes('-') || word.includes(' ') || /[A-Z].*[A-Z]/.test(word);
  
  if (hasSpecialChars || isCompound) return 'compound';
  if (length >= 9) return 'expert';
  if (length >= 7) return 'hard';
  if (length >= 5) return 'medium';
  return 'easy';
};

// Get speed category based on guess time
const getSpeedCategory = (timeTaken) => {
  if (timeTaken <= SCORING_CONFIG.SPEED_THRESHOLDS.lightning) return 'lightning';
  if (timeTaken <= SCORING_CONFIG.SPEED_THRESHOLDS.fast) return 'fast';
  if (timeTaken <= SCORING_CONFIG.SPEED_THRESHOLDS.quick) return 'quick';
  if (timeTaken <= SCORING_CONFIG.SPEED_THRESHOLDS.normal) return 'normal';
  return 'slow';
};

// Get streak multiplier based on consecutive correct guesses
const getStreakMultiplier = (consecutiveCount) => {
  if (consecutiveCount >= SCORING_CONFIG.STREAK_THRESHOLDS.epic) return SCORING_CONFIG.STREAK_MULTIPLIERS.epic;
  if (consecutiveCount >= SCORING_CONFIG.STREAK_THRESHOLDS.large) return SCORING_CONFIG.STREAK_MULTIPLIERS.large;
  if (consecutiveCount >= SCORING_CONFIG.STREAK_THRESHOLDS.medium) return SCORING_CONFIG.STREAK_MULTIPLIERS.medium;
  if (consecutiveCount >= SCORING_CONFIG.STREAK_THRESHOLDS.small) return SCORING_CONFIG.STREAK_MULTIPLIERS.small;
  return 1.0;
};

// Enhanced scoring calculation
const calculatePlayerScore = (timeRemaining, wordDifficulty, isFirstGuess = false, consecutiveCount = 0, guessPosition = 1, currentRound = 1) => {
  const timeTaken = ROUND_TIME - timeRemaining;
  const difficultyMultiplier = SCORING_CONFIG.DIFFICULTY_MULTIPLIERS[wordDifficulty];
  const speedCategory = getSpeedCategory(timeTaken);
  const speedMultiplier = SCORING_CONFIG.SPEED_MULTIPLIERS[speedCategory];
  const streakMultiplier = getStreakMultiplier(consecutiveCount);
  
  // Base score calculation
  const baseScore = SCORING_CONFIG.BASE_POINTS * difficultyMultiplier;
  
  // Time bonus (more generous for faster guesses)
  const timeBonus = Math.max(0, timeRemaining * SCORING_CONFIG.TIME_MULTIPLIER * speedMultiplier);
  
  // Position bonus (diminishing rewards for later guesses)
  const positionBonus = SCORING_CONFIG.POSITION_BONUSES[guessPosition] || 0;
  
  // Consecutive bonus
  const consecutiveBonus = baseScore * consecutiveCount * SCORING_CONFIG.CONSECUTIVE_BONUS;
  
  // Round progression bonus (games get more rewarding as they progress)
  const roundBonus = baseScore * (currentRound - 1) * SCORING_CONFIG.ROUND_PROGRESSION_BONUS;
  
  // Apply all multipliers
  let totalScore = (baseScore + timeBonus + positionBonus + consecutiveBonus + roundBonus) * streakMultiplier;
  
  return {
    total: Math.round(totalScore),
    breakdown: {
      base: Math.round(baseScore),
      timeBonus: Math.round(timeBonus),
      positionBonus,
      consecutiveBonus: Math.round(consecutiveBonus),
      roundBonus: Math.round(roundBonus),
      speedCategory,
      speedMultiplier,
      streakMultiplier,
      difficulty: wordDifficulty,
      timeTaken,
      guessPosition
    }
  };
};

// Enhanced host scoring calculation
const calculateHostScore = (correctGuesses, totalPlayers, wordDifficulty) => {
  if (correctGuesses.length === 0) return { total: 0, breakdown: {} };
  
  const difficultyMultiplier = SCORING_CONFIG.DIFFICULTY_MULTIPLIERS[wordDifficulty];
  const participationRate = correctGuesses.length / (totalPlayers - 1); // Exclude host from count
  const avgTime = correctGuesses.reduce((sum, guess) => sum + guess.timeTaken, 0) / correctGuesses.length;
  
  const basePoints = SCORING_CONFIG.HOST_BASE_POINTS * difficultyMultiplier;
  const timeBonus = Math.max(0, (ROUND_TIME - avgTime) * SCORING_CONFIG.HOST_TIME_BONUS);
  const participationBonus = participationRate * 50; // Bonus for getting more players to guess
  
  const totalScore = Math.round(basePoints + timeBonus + participationBonus);
  
  return {
    total: totalScore,
    breakdown: {
      base: Math.round(basePoints),
      timeBonus: Math.round(timeBonus),
      participationBonus: Math.round(participationBonus),
      participationRate: Math.round(participationRate * 100),
      difficulty: wordDifficulty
    }
  };
};

app.get("/", (req, res) => {
  res.send("Server is running");
});

const startHostTimer = (roomId) => {
  if (!rooms[roomId] || !rooms[roomId].users) {
    console.error(`Room ${roomId} does not exist or has no users.`);
    return;
  }

  let remainingTime = ROUND_TIME;
  rooms[roomId].remainingTime = remainingTime;
  const users = rooms[roomId].users;
  rooms[roomId].correctGuesses = [];
  rooms[roomId].timerInterval = setInterval(() => {
    if (!rooms[roomId]) {
      clearInterval(rooms[roomId].timerInterval);
      return;
    }

    remainingTime -= 1;
    rooms[roomId].remainingTime = remainingTime;
    io.to(roomId).emit("timerUpdate", remainingTime);

    if (remainingTime <= 0) {
      clearInterval(rooms[roomId].timerInterval);
      changeHost(roomId);
    }
  }, 1000);
  io.to(roomId).emit("startTimer");
};

const stopHostTimer = (roomId) => {
  if (rooms[roomId] && rooms[roomId].timerInterval) {
    clearInterval(rooms[roomId].timerInterval);
    rooms[roomId].timerInterval = null;
  }
};

const changeHost = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;

  const users = room.users;
  if (users.length > 1) {
    const currentHostIndex = users.findIndex((user) => user.host);
    if (currentHostIndex === -1) {
      console.error("No host found in the room.");
      return;
    }

    let nextHostIndex = (currentHostIndex + 1) % users.length;

    users[currentHostIndex].host = false;
    users[nextHostIndex].host = true;

    // Check if this completes a full cycle and increment round
    if (nextHostIndex === 0) {
      room.round = (room.round || 1) + 1;
      io.to(roomId).emit("roundUpdate", room.round);
      
      // Check if game should end
      if (room.round > room.totalRounds) {
        room.gameEnded = true;
        
        // Calculate final rankings
        const finalRankings = users
          .map(user => ({ name: user.name, score: user.score || 0, userId: user.userId }))
          .sort((a, b) => b.score - a.score);
        
        io.to(roomId).emit("gameEnded", {
          finalRankings,
          totalRounds: room.totalRounds
        });
        
        // Stop the timer and reset room state
        stopHostTimer(roomId);
        
        // Reset room for potential new game
        room.round = 1;
        room.gameEnded = false;
        room.gameInProgress = false;
        room.correctGuesses = [];
        room.currentWord = null;
        room.firstGuessUserId = null;
        room.guessPositions = [];
        users.forEach(user => {
          user.score = 0;
          user.host = false;
        });
        users[0].host = true; // Make first user host for new game
        
        io.to(roomId).emit("updateUsersOnline", users);
        io.to(roomId).emit("hostChanged", users[0]);
        io.to(roomId).emit("roundUpdate", 1); // Reset round display
        io.to(roomId).emit("stopTimer");
        io.to(roomId).emit("resetCanvas");
        
        return; // Exit early, don't continue with normal host change logic
      }
    }

    io.to(roomId).emit("updateUsersOnline", users);
    io.to(roomId).emit("hostChanged", users[nextHostIndex]);
    io.to(roomId).emit("stopTimer");
    io.to(roomId).emit("resetCanvas");

    // Enhanced host scoring
    const correctGuesses = room.correctGuesses || [];
    const currentWord = room.currentWord;
    
    if (correctGuesses.length > 0 && currentWord) {
      const wordDifficulty = getWordDifficulty(currentWord);
      const hostScore = calculateHostScore(correctGuesses, users.length, wordDifficulty);
      
      const host = users[currentHostIndex];
      host.score = (host.score || 0) + hostScore.total;
      
      // Broadcast detailed scoring information
      io.to(roomId).emit("hostScoring", {
        hostName: host.name,
        score: hostScore,
        word: currentWord
      });
    } else {
      // Give participation points to host even if no one guessed
      const host = users[currentHostIndex];
      host.score = (host.score || 0) + SCORING_CONFIG.PARTICIPATION_POINTS;
      
      io.to(roomId).emit("hostScoring", {
        hostName: host.name,
        score: { total: SCORING_CONFIG.PARTICIPATION_POINTS, breakdown: { participation: SCORING_CONFIG.PARTICIPATION_POINTS } },
        word: currentWord || "Unknown"
      });
    }

    // Reset room state for next round
    room.correctGuesses = [];
    room.currentWord = null;
    room.firstGuessUserId = null;
    room.guessPositions = [];

    // Reset streaks for users who didn't guess correctly
    resetAllStreaks(roomId);

    io.to(roomId).emit(
      "updateScores",
      users.map(({ userId, score, name }) => ({ userId, score, name }))
    );

    stopHostTimer(roomId);
  } else {
    console.warn(`Not enough users to proceed to the next round in room ${roomId}.`);
  }
};

const getRandomWords = () => {
  const shuffled = wordsList.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host } = data;
    if (!roomId || !name || !userId) {
      console.error("Invalid data for userJoined event:", data);
      socket.emit("roomError", { type: "invalid_data", message: "Invalid room data" });
      return;
    }

    try {
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = { 
          users: [], 
          round: 1, 
          correctGuesses: [],
          currentWord: null,
          firstGuessUserId: null,
          consecutiveGuesses: {}, // Track consecutive correct guesses per user
          lastGuessTimestamps: {}, // Anti-spam protection
          guessPositions: [], // Track order of correct guesses
          totalRounds: 3, // Default to 3 rounds
          gameEnded: false,
          gameInProgress: false
        };
      }

      // Check if user is already in the room
      const existingUser = rooms[roomId].users.find(user => user.userId === userId);
      if (existingUser) {
        console.log(`User ${userId} already exists in room ${roomId}, updating socket ID`);
        existingUser.socketId = socket.id;
      } else {
        rooms[roomId].users.push({ name, userId, host, score: 0, socketId: socket.id });
      }

      console.log(`User joined: ${JSON.stringify(data)}`);
      console.log(`Users in room ${roomId}: ${JSON.stringify(rooms[roomId].users)}`);

      io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
      
      // Send current room settings to the joining user
      socket.emit("totalRoundsUpdated", { totalRounds: rooms[roomId].totalRounds });
      socket.emit("roundUpdate", rooms[roomId].round);
    } catch (error) {
      console.error("Error in userJoined:", error);
      socket.emit("roomError", { type: "join_failed", message: "Failed to join room" });
    }
  });

  socket.on("leaveRoom", (roomId) => {
    try {
      if (!roomId) {
        console.error("No roomId provided for leaveRoom event");
        return;
      }

      if (rooms[roomId]) {
        const leavingUser = rooms[roomId].users.find(user => user.socketId === socket.id);
        
        rooms[roomId].users = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
        
        if (leavingUser) {
          console.log(`User ${leavingUser.name} left room ${roomId}`);
          // Notify other users that someone left
          socket.to(roomId).emit("userLeft", leavingUser);
        }
        
        if (rooms[roomId].users.length === 0) {
          // Clean up room data when empty
          stopHostTimer(roomId);
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted - no users remaining`);
        } else {
          // Check if the leaving user was the host
          const wasHost = leavingUser && leavingUser.host;
          if (wasHost && rooms[roomId].users.length > 0) {
            // Make the first remaining user the new host
            rooms[roomId].users[0].host = true;
            console.log(`New host assigned: ${rooms[roomId].users[0].name}`);
            io.to(roomId).emit("hostChanged", rooms[roomId].users[0]);
            io.to(roomId).emit("stopTimer");
            io.to(roomId).emit("resetCanvas");
          }
          
          io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
        }
      } else {
        console.warn(`User tried to leave non-existent room: ${roomId}`);
      }
      
      socket.leave(roomId);
    } catch (error) {
      console.error("Error in leaveRoom:", error);
      // Still try to leave the room even if there's an error
      socket.leave(roomId);
    }
  });

  // Optimized canvas sync with drawing commands instead of full images
  socket.on("canvasDrawing", (data) => {
    const { roomId, drawingCommands, timestamp } = data;
    if (!roomId || !drawingCommands) {
      console.error("Invalid data for canvasDrawing event:", data);
      return;
    }

    // Validate drawing commands structure
    if (!Array.isArray(drawingCommands)) {
      console.error("Drawing commands must be an array");
      return;
    }

    // Add rate limiting per socket to prevent spam
    const now = Date.now();
    if (!socket.lastCanvasSync) socket.lastCanvasSync = 0;
    
    const timeSinceLastSync = now - socket.lastCanvasSync;
    if (timeSinceLastSync < 16) { // Minimum 16ms between syncs (60fps max)
      return;
    }
    socket.lastCanvasSync = now;

    // Add server timestamp for sync ordering
    const syncData = {
      drawingCommands,
      timestamp: timestamp || now,
      socketId: socket.id
    };

    // Broadcast to other users in the room
    socket.to(roomId).emit("canvasDrawing", syncData);
  });

  // Fallback full canvas sync for initial state or when needed
  socket.on("canvasFullSync", (data) => {
    const { roomId, imageData } = data;
    if (!roomId || !imageData) {
      console.error("Invalid data for canvasFullSync event:", data);
      return;
    }

    // Basic validation - check if it's a valid base64 image
    if (!imageData.startsWith('data:image/')) {
      console.error("Invalid image data format");
      return;
    }

    // More restrictive rate limiting for full syncs
    const now = Date.now();
    if (!socket.lastFullSync) socket.lastFullSync = 0;
    
    const timeSinceLastFullSync = now - socket.lastFullSync;
    if (timeSinceLastFullSync < 100) { // Minimum 100ms between full syncs
      return;
    }
    socket.lastFullSync = now;

    // Broadcast to other users in the room
    socket.to(roomId).emit("canvasFullSync", { imageData });
  });

  socket.on("sendMessage", (message) => {
    const { roomId } = message;
    if (!roomId) {
      console.error("Invalid data for sendMessage event:", message);
      return;
    }

    io.to(roomId).emit("receiveMessage", message);
  });

  socket.on("startRound", (roomId) => {
    if (!rooms[roomId]) {
      console.error(`Room ${roomId} does not exist.`);
      return;
    }

    const room = rooms[roomId];
    room.gameInProgress = true;

    const randomWords = getRandomWords();
    io.to(roomId).emit("randomWords", randomWords);
    startHostTimer(roomId);
    io.to(roomId).emit("roundUpdate", room.round);
  });

  socket.on("setTotalRounds", ({ roomId, totalRounds, userId }) => {
    if (!roomId || !totalRounds || !userId) {
      console.error("Invalid data for setTotalRounds event:", { roomId, totalRounds, userId });
      return;
    }

    const room = rooms[roomId];
    if (!room) {
      console.error(`Room ${roomId} does not exist.`);
      return;
    }

    // Verify that the user setting rounds is the host
    const user = room.users.find(u => u.userId === userId);
    if (!user || !user.host) {
      console.error(`User ${userId} is not authorized to set total rounds.`);
      return;
    }

    // Prevent changing rounds if game is in progress
    if (room.gameInProgress) {
      console.error(`Cannot change total rounds while game is in progress in room ${roomId}`);
      socket.emit("roomError", { type: "game_in_progress", message: "Cannot change rounds while game is in progress" });
      return;
    }

    // Validate totalRounds (between 1 and 10)
    const rounds = parseInt(totalRounds);
    if (isNaN(rounds) || rounds < 1 || rounds > 10) {
      console.error(`Invalid total rounds value: ${totalRounds}`);
      return;
    }

    room.totalRounds = rounds;
    console.log(`Total rounds set to ${rounds} for room ${roomId}`);
    
    // Broadcast the update to all users in the room
    io.to(roomId).emit("totalRoundsUpdated", { totalRounds: rounds });
  });

  socket.on("wordChosen", ({ roomId, word }) => {
    if (!roomId || !word) {
      console.error("Invalid data for wordChosen event:", { roomId, word });
      return;
    }

    // Store the chosen word for scoring calculations
    if (rooms[roomId]) {
      rooms[roomId].currentWord = word;
      rooms[roomId].correctGuesses = [];
      rooms[roomId].firstGuessUserId = null;
      rooms[roomId].guessPositions = [];
    }

    io.to(roomId).emit("chosenWord", word);
  });

  const updateAndBroadcastScores = (roomId, userId, scoreData, timeTaken = null) => {
    if (!rooms[roomId] || !rooms[roomId].users) {
      console.error(`Room ${roomId} does not exist or has no users.`);
      return;
    }

    const room = rooms[roomId];
    const users = room.users;
    const user = users.find((user) => user.userId === userId);
    
    if (user) {
      user.score = (user.score || 0) + scoreData.total;

      if (timeTaken !== null) {
        room.correctGuesses.push({ userId, timeTaken });
        
        // Track consecutive guesses
        if (!room.consecutiveGuesses[userId]) {
          room.consecutiveGuesses[userId] = 0;
        }
        room.consecutiveGuesses[userId]++;
      }

      // Broadcast detailed scoring information
      io.to(roomId).emit("playerScoring", {
        userId,
        userName: user.name,
        scoreData,
        newTotal: user.score
      });

      io.to(roomId).emit(
        "updateScores",
        users.map(({ userId, score, name }) => ({ userId, score, name }))
      );

      const host = users.find((user) => user.host);
      const nonHostUsers = users.filter((user) => !user.host);
      const allNonHostUsersGuessed = nonHostUsers.every((user) => 
        room.correctGuesses.some((guess) => guess.userId === user.userId)
      );

      if (allNonHostUsersGuessed && host) {
        changeHost(roomId);
      }
    } else {
      console.error(`User ${userId} not found in room ${roomId}.`);
    }
  };

  socket.on("correctGuess", ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.error("Invalid data for correctGuess event:", { roomId, userId });
      return;
    }

    const room = rooms[roomId];
    if (!room) {
      console.error(`Room ${roomId} does not exist.`);
      return;
    }

    // Anti-spam protection
    const now = Date.now();
    const lastGuessTime = room.lastGuessTimestamps[userId] || 0;
    if (now - lastGuessTime < SCORING_CONFIG.MIN_GUESS_INTERVAL) {
      console.log(`User ${userId} guessing too quickly, ignoring`);
      return;
    }
    room.lastGuessTimestamps[userId] = now;

    // Check if user already guessed correctly this round
    if (room.correctGuesses.some(guess => guess.userId === userId)) {
      console.log(`User ${userId} already guessed correctly this round`);
      return;
    }

    const remainingTime = room.remainingTime || 0;
    const timeTaken = ROUND_TIME - remainingTime;
    const currentWord = room.currentWord;
    
    if (!currentWord) {
      console.error("No current word set for scoring");
      return;
    }

    // Determine if this is the first guess and track position
    const isFirstGuess = !room.firstGuessUserId;
    if (isFirstGuess) {
      room.firstGuessUserId = userId;
    }
    
    // Track guess position (1st, 2nd, 3rd, etc.)
    const guessPosition = room.guessPositions.length + 1;
    room.guessPositions.push(userId);

    // Get consecutive guess count for this user
    const consecutiveCount = room.consecutiveGuesses[userId] || 0;
    
    // Calculate enhanced score with new parameters
    const wordDifficulty = getWordDifficulty(currentWord);
    const scoreData = calculatePlayerScore(
      remainingTime, 
      wordDifficulty, 
      isFirstGuess, 
      consecutiveCount, 
      guessPosition, 
      room.round || 1
    );

    updateAndBroadcastScores(roomId, userId, scoreData, timeTaken);
    
    // Emit the correct guess event for UI updates
    io.to(roomId).emit("correctGuess", userId);
  });

  socket.on("disconnecting", () => {
    try {
      const socketRooms = Array.from(socket.rooms);
      socketRooms.forEach((roomId) => {
        if (roomId !== socket.id && rooms[roomId]) {
          const disconnectingUser = rooms[roomId].users.find(user => user.socketId === socket.id);
          
          rooms[roomId].users = rooms[roomId].users.filter((user) => user.socketId !== socket.id);
          
          if (disconnectingUser) {
            console.log(`User ${disconnectingUser.name} disconnected from room ${roomId}`);
            // Notify other users that someone disconnected
            socket.to(roomId).emit("userLeft", disconnectingUser);
          }
          
          if (rooms[roomId].users.length === 0) {
            // Clean up room data when empty
            stopHostTimer(roomId);
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted - all users disconnected`);
          } else {
            // Check if the disconnecting user was the host
            const wasHost = disconnectingUser && disconnectingUser.host;
            if (wasHost && rooms[roomId].users.length > 0) {
              // Make the first remaining user the new host
              rooms[roomId].users[0].host = true;
              console.log(`New host assigned after disconnect: ${rooms[roomId].users[0].name}`);
              io.to(roomId).emit("hostChanged", rooms[roomId].users[0]);
              io.to(roomId).emit("stopTimer");
              io.to(roomId).emit("resetCanvas");
            }
            
            io.to(roomId).emit("updateUsersOnline", rooms[roomId].users);
          }
        }
      });
    } catch (error) {
      console.error("Error during socket disconnecting:", error);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`A user disconnected: ${reason}`);
  });
});

// Handle consecutive streak management
const handleStreakBreak = (roomId, userId) => {
  const room = rooms[roomId];
  if (!room) return;
  
  // Reset consecutive count for users who didn't guess correctly
  if (room.consecutiveGuesses[userId]) {
    room.consecutiveGuesses[userId] = 0;
  }
};

// Reset all user streaks when round ends
const resetAllStreaks = (roomId) => {
  const room = rooms[roomId];
  if (!room) return;
  
  // Reset streaks for users who didn't guess correctly this round
  const correctUserIds = room.correctGuesses.map(guess => guess.userId);
  room.users.forEach(user => {
    if (!correctUserIds.includes(user.userId)) {
      room.consecutiveGuesses[user.userId] = 0;
    }
  });
};

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
