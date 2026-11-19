const inputCantidad = document.getElementById('cantidad');
const selectOrigen = document.getElementById('moneda-origen');
const selectDestino = document.getElementById('moneda-destino');
const btnInvertir = document.getElementById('btn-invertir');
const textoTasa = document.getElementById('tasa-info');
const textoResultado = document.getElementById('resultado');

const tasasRespectUSD = {
    USD: 1.00,
    MXN: 20.00,
    EUR: 0.91,
    COP: 4350.00,
    ARS: 1000.00,
    JPY: 154.00
}

function calcularConverion() {
    const cantidad = parseFloat(inputCantidad.value);
    const origen = selectOrigen.value;
    const destino = selectDestino.value;

    if (isNaN(cantidad) || cantidad < 0){
        textoResultado.textContent = "Ingresa una cantidad valida";
        textoTasa.textContent = "---";
        return;
    }
    
        const enDolares = cantidad / tasasRespectUSD[origen];
        const resultadoFinal = enDolares * tasasRespectUSD[destino];
        const tasaUnitaria = (1/tasasRespectUSD[origen] * tasasRespectUSD[destino]);

        const formateador = new Intl.NumberFormat('es-MX',{
            style: 'currency',
            currency: destino,
            minimumFractionDigits:2,
            maximumFractionDigits:2
        })

        textoTasa.textContent = `1 ${origen} = ${tasaUnitaria.toFixed(4)} ${destino}`;
        textoResultado.textContent = formateador.format(resultadoFinal);
}
function invertirMonedas(){
    const temporal = selectOrigen.value;
    selectOrigen.value = selectDestino.value;
    selectDestino.value = temporal;
    calcularConverion();
}

inputCantidad.addEventListener('input', calcularConverion);
selectOrigen.addEventListener('change', calcularConverion);
selectDestino.addEventListener('change',calcularConverion);
btnInvertir.addEventListener('click',calcularConverion);

calcularConverion();
