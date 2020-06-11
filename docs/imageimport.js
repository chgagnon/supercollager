// query elements of the DOM only after they've loaded (avoids receiving undefined values)
document.addEventListener('DOMContentLoaded', (event) => {


function uploadTiles(event) {
  alert('hey!');

  const fileList = this.files;
  const numFiles = fileList.length;

  for (let i = 0; i < numFiles; i++) {
    let img = document.createElement("img");
    img.src = URL.createObjectURL(fileList[i]);
    img.setAttribute('width', '200 px');
    document.body.appendChild(img);
    console.log(i);
  }
};

const tileButton = document.getElementsByClassName("tileButton")[0];
const tileInput = document.getElementById('tileInput');

tileButton.addEventListener('click', function () {
  tileInput.click();
});

tileInput.addEventListener('change', uploadTiles);


})
