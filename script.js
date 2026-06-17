function addRow() {

    let table = document.getElementById("stateTable");

    let row = table.insertRow();

    row.insertCell(0).innerHTML = "<input>";
    row.insertCell(1).innerHTML = "<input>";
    row.insertCell(2).innerHTML = "<input>";
    row.insertCell(3).innerHTML = "<input>";
} function generate() {

    let table = document.getElementById("stateTable");

    let ffType = document.getElementById("ffType").value;

    let stateMap = {};

    let currentCode = 0;

    for (let i = 1; i < table.rows.length; i++) {

        let present =
            table.rows[i].cells[0].children[0].value;

        let next =
            table.rows[i].cells[2].children[0].value;

        if (stateMap[present] === undefined) {
            stateMap[present] = currentCode;
            currentCode++;
        }

        if (stateMap[next] === undefined) {
            stateMap[next] = currentCode;
            currentCode++;
        }
    }

    let result = "<h3>State Encoding</h3>";

    for (let state in stateMap) {

        let binary =
            stateMap[state].toString(2).padStart(2, '0');

        result +=
            state + " &rarr; " + binary + "<br>";
    }

    result += "<br><h3>Binary State Table</h3>";


    for (let i = 1; i < table.rows.length; i++) {

        let present =
            table.rows[i].cells[0].children[0].value;

        let x =
            table.rows[i].cells[1].children[0].value;

        let next =
            table.rows[i].cells[2].children[0].value;

        let presentBinary =
            stateMap[present].toString(2).padStart(2, '0');

        let nextBinary =
            stateMap[next].toString(2).padStart(2, '0');

        result +=
            presentBinary + " , "
            + x + " , "
            + nextBinary + "<br>";
    }

    result += "<br><h3>" + ffType + " Excitation Table</h3>";
    for (let i = 1; i < table.rows.length; i++) {

        let present =
            table.rows[i].cells[0].children[0].value;

        let next =
            table.rows[i].cells[2].children[0].value;

        let q =
            stateMap[present];

        let qp =
            stateMap[next];

        let J, K;

        if (ffType == "JK Flip-Flop") {
            if (q == 0 && qp == 0) {
                J = "0";
                K = "X";
            }
            else if (q == 0 && qp == 1) {
                J = "1";
                K = "X";
            }
            else if (q == 1 && qp == 0) {
                J = "X";
                K = "1";
            }
            else {
                J = "X";
                K = "0";
            }

            result +=
                "Q=" + q +
                " Q+=" + qp +
                " J=" + J +
                " K=" + K +
                "<br>";
        }
        else if (ffType == "D Flip-Flop") {
            let D = qp;

            result +=
                "Q=" + q +
                " Q+=" + qp +
                " D=" + D +
                "<br>";
        }
        else if (ffType == "T Flip-Flop") {
            let T;

            if (q == qp) {
                T = "0";
            }
            else {
                T = "1";
            }

            result +=
                "Q=" + q +
                " Q+=" + qp +
                " T=" + T +
                "<br>";
        }
        else if (ffType == "SR Flip-Flop") {
            let S, R;

            if (q == 0 && qp == 0) {
                S = "0";
                R = "X";
            }
            else if (q == 0 && qp == 1) {
                S = "1";
                R = "0";
            }
            else if (q == 1 && qp == 0) {
                S = "0";
                R = "1";
            }
            else {
                S = "X";
                R = "0";
            }

            result +=
                "Q=" + q +
                " Q+=" + qp +
                " S=" + S +
                " R=" + R +
                "<br>";
        }
    }
    result += "<br><h3>Simplified Equations</h3>";

    if (ffType == "JK Flip-Flop") {
        result += "J = X<br>";
        result += "K = X'<br>";
    }
    else if (ffType == "D Flip-Flop") {
        result += "D = X<br>";
    }
    else if (ffType == "T Flip-Flop") {
        result += "T = Q ⊕ X<br>";
    }
    else if (ffType == "SR Flip-Flop") {
        result += "S = X · Q'<br>";
        result += "R = X' · Q<br>";
    }


    document.getElementById("equations").innerHTML = result;

    let diagram = "";

    if (ffType == "JK Flip-Flop") {
        diagram = `
<h3>JK Flip-Flop Circuit</h3>
<pre>
X -----> J

      [ JK FF ] -----> Q

X' ----> K
</pre>`;
    }
    else if (ffType == "D Flip-Flop") {
        diagram = `
<h3>D Flip-Flop Circuit</h3>
<pre>
D -----> [ D FF ] -----> Q
</pre>`;
    }
    else if (ffType == "T Flip-Flop") {
        diagram = `
<h3>T Flip-Flop Circuit</h3>
<pre>
T -----> [ T FF ] -----> Q
</pre>`;
    }
    else if (ffType == "SR Flip-Flop") {
        diagram = `
<h3>SR Flip-Flop Circuit</h3>
<pre>
S ----->

        [ SR FF ] -----> Q

R ----->
</pre>`;
    }

    document.getElementById("diagram").innerHTML = diagram;
}