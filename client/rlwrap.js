// This set of functions implements rlwrap-style behavior on the
// text input box.  You don't need to read it.
// TODO: turn into a library, at the moment there is only ONE GLOBAL
// THING

var history_arr, history_cur;
if ($.totalStorage('history')) {
    history_arr = $.totalStorage('history');
    history_cur = history_arr.length - 1;
} else {
    history_arr = [["", ""]];
    history_cur = 0;
}
// Invariant: top-most entry is the "current edit box"
// When we modify a history entry, it is saved in H_EDITED;
// but note we also keep the original around (it's not lost)
var H_EDITED = 0, H_ORIG = 1;
function upHistory(edited) {
    if (history_cur == 0) {
        // no more history, no-op!
        return edited;
    }
    history_arr[history_cur][H_EDITED] = edited;
    history_cur--;
    return history_arr[history_cur][H_EDITED];
}
function downHistory(edited) {
    if (history_cur == history_arr.length - 1) {
        // no more future, no-op!
        return edited;
    }
    history_arr[history_cur][H_EDITED] = edited;
    history_cur++;
    return history_arr[history_cur][H_EDITED];
}
function addHistory(added) {
    // rlwrap is a bit tricky here, depending on whether or not
    // it's the top entry, or a history edit
    if (history_cur != history_arr.length - 1) {
        // reset the historical entry
        history_arr[history_cur][H_EDITED] = history_arr[history_cur][H_ORIG];
        history_cur = history.length - 1;
    }
    if (history_cur == 0 || added != history_arr[history_cur-1][H_EDITED]) {
        history_arr[history_cur][H_ORIG] = added;
        history_arr[history_cur][H_EDITED] = added;
        history_cur++;
        history_arr.push(["", ""]);
    } else {
        // we DO NOT add it to the history if it would cause
        // two adjacent entries with the same
        history_arr[history_cur][H_EDITED] = "";
    }
    // save it to local storage so that it's preserved across refresh
    $.totalStorage('history', history_arr);
}
