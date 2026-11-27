/**
 * Pure Tic-Tac-Toe presentation and winner helpers.
 */

function renderTicTacToeBoard(board) {
    const cells = board.map((v, i) => v || String(i + 1));
    return `${cells[0]} | `${cells[1]} | `${cells[2]}\n---------\n`${cells[3]} | `${cells[4]} | `${cells[5]}\n---------\n`${cells[6]} | `${cells[7]} | `${cells[8]}`;
}

function getTicTacToeWinner(board) {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    return lines.some(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

module.exports = { renderTicTacToeBoard, getTicTacToeWinner };
