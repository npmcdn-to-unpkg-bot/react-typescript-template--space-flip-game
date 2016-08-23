"use strict";
(function (Dimension) {
    Dimension[Dimension["width"] = 0] = "width";
    Dimension[Dimension["height"] = 1] = "height";
})(exports.Dimension || (exports.Dimension = {}));
var Dimension = exports.Dimension;
(function (PlayerColor) {
    PlayerColor[PlayerColor["Red"] = 0] = "Red";
    PlayerColor[PlayerColor["Blue"] = 1] = "Blue";
    PlayerColor[PlayerColor["Green"] = 2] = "Green";
})(exports.PlayerColor || (exports.PlayerColor = {}));
var PlayerColor = exports.PlayerColor;
;
(function (Direction) {
    Direction[Direction["DownRight"] = 360] = "DownRight";
    Direction[Direction["Down"] = 45] = "Down";
    Direction[Direction["DownLeft"] = 90] = "DownLeft";
    Direction[Direction["Left"] = 135] = "Left";
    Direction[Direction["UpLeft"] = 180] = "UpLeft";
    Direction[Direction["Up"] = 225] = "Up";
    Direction[Direction["UpRight"] = 270] = "UpRight";
    Direction[Direction["Right"] = 315] = "Right";
})(exports.Direction || (exports.Direction = {}));
var Direction = exports.Direction;
;
