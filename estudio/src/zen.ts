// El velo del modo enfoque: una capa que desenfoca y tiñe todo lo que queda debajo de lo enfocado (la ventana del
// documento o la tarjeta de la misión), con un viñeteado quieto y tenue del color del tema. Es solo CSS (director.css ›
// .velo-zen): entra y sale suave, con el desenfoque y el tinte creciendo juntos, y después no se mueve ni sigue al
// puntero. Aquí solo se monta, una vez y desde el principio (así ya la primera vez entra suave); lo pone y lo quita
// director.ts con la clase «enfoque» (un documento) o «enfoque-mision» (la misión) del documento. La cabecera lleva uno
// igual, alineado con este, para que el botón del enfoque quede encima (director.css › .cabeza-proyecto::after).

const velo = document.createElement('div');
velo.className = 'velo-zen';
velo.setAttribute('aria-hidden', 'true');
document.body.append(velo);
