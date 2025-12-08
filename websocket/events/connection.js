module.exports = (socket) => {
  socket.on("disconnect", (err) => {
    console.log("Disconnect: ", err);
  });

  socket.on("test", (data) => {
    console.log("Emit Test: ", data);

    socket.broadcast.emit("test", "Back from server");
  });
};
