async function testAltisHttp() {
  try {
    const res = await fetch('http://5.250.255.86:17356');
    const text = await res.text();
    console.log('Altis HTTP Response status:', res.status);
    console.log('Altis HTTP Response snippet:', text.slice(0, 300));
  } catch (err) {
    console.error('Altis HTTP Error:', err);
  }
}

testAltisHttp();
