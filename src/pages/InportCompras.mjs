import axios from 'axios';
import https from 'https';
import cheerio from 'cheerio';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, get } from 'firebase/database';

// Opção para desativar a verificação do certificado SSL
const axiosOptions = {
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
};

// Inicialize o Firebase com as configurações do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyDSXyMVJ7_1JuqreO3hW9cL5SRx6hgvze0",
  authDomain: "marketeconomyapp.firebaseapp.com",
  databaseURL: 'https://marketeconomyapp-default-rtdb.firebaseio.com/',
  projectId: "marketeconomyapp",
  storageBucket: "marketeconomyapp.appspot.com",
  messagingSenderId: "829785764962",
  appId: "1:829785764962:web:fad4b4d54cea3caf980d3b"
};

const app = initializeApp(firebaseConfig);

// Função para gravar as informações no Firebase
async function saveDataToFirebase(data) {
  const database = getDatabase();

  // Defina a estrutura do dado que você quer salvar
  const purchaseData = {
    establishmentName: data.establishmentName,
    establishmentID: data.establishmentID,
    address: data.address,
    numberNF: data.numberNF,
    issuance: data.issuance,
    chaveAcessoNF: data.chaveAcessoNF,
    statusCode: data.statusCode,
    consumerID: data.consumerID,
    productList: data.productList
  };

  try {
    // Salve os dados no Firebase Realtime Database
    const newPurchaseRef = push(ref(database, 'purchases'));
    await set(newPurchaseRef, purchaseData);

    console.log('Dados salvos com sucesso no Firebase!');
  } catch (error) {
    console.error('Erro ao salvar os dados:', error);
  }
}

async function fetchDataFromURL(url) {
  try {
    const response = await axios.get(url, axiosOptions);
    // A resposta contém os dados obtidos da URL
    return response.data;
  } catch (error) {
    console.error('Erro ao obter os dados:', error);
    return null;
  }
}

function extractPurchaseDataFromHTML(html) {
  const $ = cheerio.load(html);

  const establishmentName = $('#u20.txtTopo').text().trim();
  const establishmentID = $('#conteudo .txtCenter .text:first').text().replace(/\s+/g, '').split(':')[1];
  const address = $('#conteudo .txtCenter .text:first').next().text().replace(/\n\s*/g, '').replace(/,\s*$/, '');

  const infoContainer = $('#infos');

  const infoText = infoContainer.text();

  const extractInfo = (pattern) => {
    const match = infoText.match(pattern);
    return match ? match[1].trim() : '';
  };

  const numberNF = extractInfo(/Número: ([\s\S]+?)Série/);
  const issuance = extractInfo(/Emissão: ([\s\S]+?)Protocolo de Autorização/).split('\n')[0];
  const chaveAcessoNFMatch = infoText.match(/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/);
  const chaveAcessoNF = chaveAcessoNFMatch ? chaveAcessoNFMatch[0] : '';
  const statusCode = extractInfo(/Código da Mensagem: (\d+)Descrição da Mensagem:/);
  const consumerID = extractInfo(/ConsumidorCPF: (\d{3}\.\d{3}\.\d{3}-\d{2})/);

  const purchase = {
    establishmentName: establishmentName,
    establishmentID: establishmentID,
    address: address,
    numberNF: numberNF,
    issuance: issuance,
    chaveAcessoNF: chaveAcessoNF,
    statusCode: statusCode,
    consumerID: consumerID,
    productList: [] // We'll populate this later
  };

  return purchase;
}

function extractProductDataFromHTML(html) {
  const $ = cheerio.load(html);
  const productList = [];

  // Encontre o elemento que contém a lista de produtos
  const productRows = $('#tabResult tr[id^="Item +"]');

  // Itere sobre as linhas da tabela de produtos
  productRows.each((index, element) => {
    const productNameFull = $(element).find('.txtTit').text().trim();
    const productName = productNameFull.split('\n')[0];

    const codeText = $(element).find('.RCod').text().trim();
    const codeMatch = codeText.match(/\d+/);
    const productCode = codeMatch ? codeMatch[0] : '';

    const quantityText = $(element).find('.Rqtd strong:contains("Qtde.")').parent().text();
    const quantityMatch = quantityText.match(/\d+(?:,\d+)?/);
    const quantity = quantityMatch ? parseFloat(quantityMatch[0].replace(',', '.')) : 0;

    const unitTypeText = $(element).find('.RUN strong:contains("UN:")').parent().text().trim();
    const unitTypeMatch = unitTypeText.match(/UN:\s*(\w+)/);
    const unitType = unitTypeMatch ? unitTypeMatch[1] : '';

    const unitPriceText = $(element).find('.RvlUnit strong:contains("Vl. Unit.:")').parent().text().trim();
    const unitPriceMatch = unitPriceText.match(/Vl. Unit.:\s*([\d.,]+)/);
    const unitPrice = unitPriceMatch ? parseFloat(unitPriceMatch[1].replace(',', '.')) : 0;

    const totalValueText = $(element).find('.valor').text().trim();
    const totalValue = parseFloat(totalValueText.replace(',', '.'));

    productList.push({
      name: productName,
      code: productCode,
      quantity: quantity,
      unitType: unitType,
      unitPrice: unitPrice,
      totalValue: totalValue
    });
  });

  return productList;
}

const url = 'http://www.dfe.ms.gov.br/nfce/qrcode?p=50230806813685000171650080001746201163400920|2|1|1|270054AB4FE5595138035F1975BA3F311AEBD7E6';

async function checkIfDataExists(data) {
  const database = getDatabase();
  const purchasesRef = ref(database, 'purchases');

  try {
    const snapshot = await get(purchasesRef);

    if (snapshot.exists()) {
      const purchases = snapshot.val();
      for (const purchaseKey in purchases) {
        const existingPurchase = purchases[purchaseKey];
        if (
          existingPurchase.establishmentID === data.establishmentID &&
          existingPurchase.numberNF === data.numberNF &&
          existingPurchase.issuance === data.issuance &&
          existingPurchase.chaveAcessoNF === data.chaveAcessoNF
        ) {
          return true; // Data already exists
        }
      }
    }

    return false; // Data doesn't exist
  } catch (error) {
    console.error('Erro ao verificar os dados:', error);
    throw error;
  }
}

fetchDataFromURL(url)
  .then(async (data) => {
    if (data) {
      const purchase = extractPurchaseDataFromHTML(data);
      const productList = extractProductDataFromHTML(data);
      purchase.productList = productList;
      console.log(purchase);

      try {
        const dataExists = await checkIfDataExists(purchase);

        if (!dataExists) {
          saveDataToFirebase(purchase)
            .then(() => {
              console.log('Dados gravados na base de dados!');
              process.exit(0); // Finaliza o programa
            })
            .catch((error) => {
              console.error('Erro ao salvar os dados:', error);
              process.exit(1); // Finaliza o programa com erro
            });
        } else {
          console.log('Os dados já foram gravados anteriormente.');
          process.exit(0); // Finaliza o programa
        }
      } catch (error) {
        console.error('Erro geral:', error);
        process.exit(1); // Finaliza o programa com erro
      }
    } else {
      console.log('Não foi possível obter os dados.');
      process.exit(1); // Finaliza o programa com erro
    }
  })
  .catch((error) => {
    console.error('Erro geral:', error);
    process.exit(1); // Finaliza o programa com erro
  });
