async function fetchFeriados(ano) {
    const url = `https://brasilapi.com.br/api/feriados/v1/${ano}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao buscar feriados');
    return await response.json();
}

function formatarData(data) {
    return data.toISOString().split('T')[0];
}

function formatarDataExibicao(data) {
    return data.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function isDiaUtil(data, feriadosSet) {
    const dataString = formatarData(data);
    const diaSemana = data.getDay();

    const isFeriado = feriadosSet.has(dataString);
    const isFinalDeSemana = diaSemana === 0 || diaSemana === 6;

    return !isFinalDeSemana && !isFeriado;
}

async function carregarFeriados(anoAtual, feriadosMap) {
    if (!feriadosMap.has(anoAtual)) {
        const feriadosAnoAtual = await fetchFeriados(anoAtual);
        feriadosAnoAtual.forEach(f => {
            const feriado = new Date(f.date);
            feriado.setDate(feriado.getDate() + 1);
            feriadosMap.set(formatarData(feriado), f.name);
        });
    }
    if (!feriadosMap.has(anoAtual + 1)) {
        const feriadosProximoAno = await fetchFeriados(anoAtual + 1);
        feriadosProximoAno.forEach(f => {
            const feriado = new Date(f.date);
            feriado.setDate(feriado.getDate() + 1);
            feriadosMap.set(formatarData(feriado), f.name);
        });
    }
}

async function calcularDiasUteis() {
    const startDateInput = document.getElementById("startDate").value;
    const daysCount = parseInt(document.getElementById("daysCount").value);
    const prazoTipo = document.getElementById("prazoTipo").value;

    if (!startDateInput || !daysCount) {
        alert("Por favor, insira uma data de início e o número de dias.");
        return;
    }

    let currentDate = new Date(startDateInput);
    let anoAtual = currentDate.getFullYear();
    const feriadosMap = new Map();

    try {
        await carregarFeriados(anoAtual, feriadosMap);

        // Ignora o dia atual e encontra o próximo dia útil
        currentDate.setDate(currentDate.getDate() + 1);
        while (!isDiaUtil(currentDate, feriadosMap)) {
            currentDate.setDate(currentDate.getDate() + 1);
        }

        let startCountingDate = new Date(currentDate);

        if (prazoTipo === "disponibilizacao") {
            // Avança para o segundo dia útil
            let diasUteisAvancados = 0;
            while (diasUteisAvancados < 2) {
                currentDate.setDate(currentDate.getDate() + 1);
                if (isDiaUtil(currentDate, feriadosMap)) {
                    diasUteisAvancados++;
                }
            }
            startCountingDate = new Date(currentDate);
        } 
        if (prazoTipo === "publicacao") {
            // Avança para o próximo dia útil (1 dia útil à frente)
            currentDate.setDate(currentDate.getDate() + 1); // Avança para o próximo dia
            while (!isDiaUtil(currentDate, feriadosMap)) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            startCountingDate = new Date(currentDate);
        }

        let diasUteisContados = 0;
        const diasDetalhes = [];
        let contadorgeral = 0;

        while (diasUteisContados < daysCount) {
            const anoCorrente = currentDate.getFullYear();
            if (anoCorrente > anoAtual) {
                anoAtual = anoCorrente;
                await carregarFeriados(anoAtual, feriadosMap);
            }

            const currentDateString = formatarData(currentDate);
            const diaSemana = currentDate.getDay();
            const nomeDiaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][diaSemana];

            if (isDiaUtil(currentDate, feriadosMap)) {
                diasDetalhes.push({
                    contadorgeral: contadorgeral += 1,
                    data: formatarDataExibicao(currentDate),
                    diaSemana: nomeDiaSemana,
                    motivo: "Dia Útil",
                    classe: "diaUtil"
                });
                diasUteisContados++; // Incrementa apenas após adicionar dia útil à lista
            } else {
                const motivo = diaSemana === 0 || diaSemana === 6
                    ? "Fim de semana"
                    : `Feriado (${feriadosMap.get(currentDateString)})`; // Mostra o nome do feriado
                diasDetalhes.push({
                    contadorgeral: "x",
                    data: formatarDataExibicao(currentDate),
                    diaSemana: nomeDiaSemana,
                    motivo: motivo,
                    classe: "feriado"
                });
            }

            // Avança para o próximo dia, mas somente após verificar o dia atual
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Exibe as informações na interface
        document.getElementById("startCountingDate").innerHTML = `Data de início do prazo: ${formatarDataExibicao(startCountingDate)}`;
        document.getElementById("result").innerHTML = `Data final após ${daysCount} dias úteis: ${formatarDataExibicao(new Date(currentDate.setDate(currentDate.getDate() - 1)))}`;

        const diasBody = document.getElementById("diasBody");
        document.getElementById("diasTable").style.display = "none";
        diasBody.innerHTML = ""; // Limpa a tabela

        diasDetalhes.forEach(dia => {
            const row = document.createElement("tr");
            row.classList.add(dia.classe);
            row.innerHTML = `
                <td>${dia.contadorgeral}</td>
                <td>${dia.data}</td>
                <td>${dia.diaSemana}</td>
                <td>${dia.motivo}</td>
            `;
            diasBody.appendChild(row);
        });
        document.getElementById("diasTable").style.display = "table";
    } catch (error) {
        console.error(error);
        alert("Não foi possível calcular os dias úteis.");
    }
}
