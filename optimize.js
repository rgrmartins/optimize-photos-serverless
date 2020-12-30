// Está função que iremos criar será para otmizar imagens salvas no S3
'use strict';

const AWS = require('aws-sdk'); // Importado de forma automática na Lambda dentro da AWS
const sharp = require('sharp');
const { basename, extname } = require('path');

const S3 = new AWS.S3();

module.exports.handle = async ({ Records: records }, context) => {
  try {
    /**
     *  pode ocorrer de vir mais de um event ao mesmo tempo, Caso seja salvo 3 imagens por exemplo ao mesmo tempo
     * Por isso vamos fazer o MAP 
    */
   /**
    * Promisse.all porque o async dentro do MAP não espera
    */
   await Promise.all(records.map(async record => {
     const { key } = record.s3.object; // Caminho da imagem dentro do S3

     const image = await S3.getObject({
       Bucket: process.env.bucket,
       Key: key,
     }).promise();

     /**
      * Agora temos o arquivo de imagem, podemos redimensionar, tratar etc
      */
     const optimized = await sharp(image.Body)
        .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
        .toFormat('jpeg', { progressive: true, quality: 50  })
        .toBuffer();

      await S3.putObject({
        Body: optimized,
        Bucket: process.env.bucket,
        ContentType: 'image/jpeg',
        Key: `compressed/${basename(key, extname(key))}.jpg` // tem que passar uma nova pasta, para não gerar um loop eterno na lambda salvando o arquivo na mesma key e disparando novamnte a lambda
      }).promise();
   }));

   return {
     statusCode: 301, //Status de Criado
     body: {},
   }
  } catch (err) {
    return err;
  }
};
