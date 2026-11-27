/**
 * Pure Tic-Tac-Toe presentation and winner helpers.
 */

function renderTicTacToeBoard(board) {
    const cells = board.map((v, i) => v || String(i + 1));
    return [
        cells.slice(0, 3).join(' | '),
        '---------',
        cells.slice(3, 6).join(' | '),
        '---------',
        cells.slice(6, 9).join(' | ')
    ].join('\n');
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
