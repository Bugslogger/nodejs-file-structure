const fs = require("fs");

module.exports = (io) => {
  //   console.log("IO: ", io);

  try {
    fs.readdir(`${process.cwd()}/websocket/events`, (_err, files) => {
      if (_err) {
        return _err;
      }
      console.log("Files: ", files);

      files.forEach((file) => {
        if (!file.endsWith(".js")) return;
        const event = require(`${process.cwd()}/websocket/events/${file}`);

        let eventName = file.split(".")[0];

        io.on(eventName, event.bind());
        delete require.cache[
          require.resolve(`${process.cwd()}/websocket/events/${file}`)
        ];
      });
    });
  } catch (error) {
    console.log("Socket event connection: ", error);
  }
};
