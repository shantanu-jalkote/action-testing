// @ts-check
/// <reference path="../../types/mongoose/index.d.ts" />
// @ts-ignore
const db = require("../models");
// @ts-ignore
const logger = require("../../logger");
// @ts-ignore
const { convertStringIdToMongoDBObjectId, generateNewObjectId } = require("../services/mongooseHelperService");
// @ts-ignore
const AutomatedAiAssistantLabelling = require('../models/aiAssistantLabelling.model');
// @ts-ignore importing below for type definitions
const { Request, Response } = require('express');
const CloudStorage = require("../middlewares/cloudStorage");
const AI_ASSISTANT_LABELLING_CURRENT_TASK="AIAssistedLabelling";

const { getAiAssistantLabellingGlobalPackageFileName, getAiAssistantLabellingLibrariesRequirementsFileName, getAiAssistantLabellingFolderPath , getResourceStorageFileName, getAiAssistantGcpCredentialsJsonForDeploymentFileName, getAiAssistantLabellingUserCodeBaseFilepath, getAiAssistantModelFileName } = require("../middlewares/cloudStorageFilePaths");

const { getFileContentType } = require("../services/fileHelperService");

const aiAssistantLabelling = db.aiAssistantLabelling;

const { ADD_NEW_MODEL_BACKEND_BASEURL, RESOURCE_STATUS_PENDING, MODEL_TYPES_THAT_DONOT_REQUIRE_RESOURCE_FILE } = require("../configs/app.config");
const { default: axios } = require("axios");
const { copyByValue, isNullOrUndefined } = require("../services/variableHelperService");
const Model = require("../models/model.model");
const Resource = require("../models/resource.model");
const FormData = require('form-data');
const config = require("../configs/app.config");
const AiAssistantLabellingHelperService = require("../services/AiAssistantLabellingHelperService");
const Project = require("../models/project.model");
const { sendMailToUserForAiAssistantLabellingStatus } = require("../services/mailHelperService");
const User = require("../models/user.model");


/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.createAutomatedAiAssistantLabelling = async (req, res) => {
  try {

    const aiAssistantLabellingWithSameName = await AutomatedAiAssistantLabelling.find({
      name: req.body.name,
      projectId: convertStringIdToMongoDBObjectId(req.body?.projectId)
    })

    if(aiAssistantLabellingWithSameName.length>0) {
      throw new Error('AI Assistant Labelling name already exists');
    }
    const user = await User.findOne({emailId: req.userEmail})

    const aiAssistantLabelling = new AutomatedAiAssistantLabelling({
        ...req.body,
        createdByUserId: user._id,
        projectId: convertStringIdToMongoDBObjectId(req.body?.projectId)
    })
   const response =  await aiAssistantLabelling.save();

   return res.status(200).json({message: "New AI Assistant Labelling created successfully!" , response})


    
  } catch (error) {
    logger.error("error~createAutomatedAiAssistantLabelling", error)
    return res.status(500).json({error: error.message})
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.getAllAutomatedAiAssistantLabellings = async (req, res) => {
    try {

        const filter={}
        const projectIdQueryParam = req?.query?.projectId || "";
        const ids = req?.query?.ids || "";
        const getGlobalPackageFileDownloadUrl = req?.query?.getGlobalPackageFileDownloadUrl === "true" ?? false;
        const getLibrariesRequirementFileDownloadUrl = req?.query?.getLibrariesRequirementFileDownloadUrl === "true" ?? false;
        const getGcsCredentialsJsonFileDownloadUrl = req?.query?.getGcsCredentialsJsonFileDownloadUrl === "true" ?? false;
        const getTasks = req?.query?.getTasks === "true" ?? false ;
        const getModelFileDownloadUrl = req?.query?.getModelFileDownloadUrl === "true" ?? false

        if(projectIdQueryParam) {
          filter.projectId = convertStringIdToMongoDBObjectId(projectIdQueryParam.toString())
        }

        if(ids) {
          filter._id = {
            $in: ids
          }
        }

        const aiAssistantLabellings = await AutomatedAiAssistantLabelling.find(
            {...filter}
        );
        const projectId = aiAssistantLabellings[0]?.projectId || "";
        const cloudStorage = new CloudStorage();
        await cloudStorage.init({ projectId: projectId.toString() });

        let updatedAiAssitantLabellingdata = [];
        
          updatedAiAssitantLabellingdata = await Promise.all(aiAssistantLabellings.map(async(aiAssistantLabelling) => {
            const updatedAiAssistantLabelling = {
              ...aiAssistantLabelling.toObject(),
              globalPackageFilePath: "",
              librariesRequirementsFilePath: "",
              globalPackageFileDownloadUrl: "",
              librariesRequirementsFileDownloadUrl: "",
              taskNames : [],
            };

            if (
              getGlobalPackageFileDownloadUrl &&
              aiAssistantLabelling.globalPackageFileName
            ) {
              updatedAiAssistantLabelling.globalPackageFilePath = getAiAssistantLabellingGlobalPackageFileName(
                aiAssistantLabelling.projectId,
                aiAssistantLabelling._id,
                aiAssistantLabelling.globalPackageFileName
              );
              updatedAiAssistantLabelling.globalPackageFileDownloadUrl = await cloudStorage.generateSignedUrl(
                updatedAiAssistantLabelling.globalPackageFilePath
              );

            }
    
            if (
              getLibrariesRequirementFileDownloadUrl &&
              aiAssistantLabelling.librariesRequirementsFileName
            ) {
              updatedAiAssistantLabelling.librariesRequirementsFilePath = getAiAssistantLabellingLibrariesRequirementsFileName(
                aiAssistantLabelling.projectId,
                aiAssistantLabelling._id,
                aiAssistantLabelling.librariesRequirementsFileName
              );
              updatedAiAssistantLabelling.librariesRequirementsFileDownloadUrl = await cloudStorage.generateSignedUrl(
                updatedAiAssistantLabelling.librariesRequirementsFilePath
              );
            }

            if (
              getGcsCredentialsJsonFileDownloadUrl &&
              aiAssistantLabelling.GCPCredentialsJsonFileName
            ) {
              let gcsCredentialsJsonFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(
                aiAssistantLabelling.projectId,
                aiAssistantLabelling._id,
                aiAssistantLabelling.GCPCredentialsJsonFileName
              );
              updatedAiAssistantLabelling.GCPCredentialSJsonFileDownloadURL = await cloudStorage.generateSignedUrl(
                gcsCredentialsJsonFilePath
              );
            }

            if (
              getModelFileDownloadUrl &&
              aiAssistantLabelling.modelFileName
            ) {
              let modelFilePath = getAiAssistantModelFileName(
                aiAssistantLabelling.projectId,
                aiAssistantLabelling._id,
                aiAssistantLabelling.modelFileName
              );
              updatedAiAssistantLabelling.modelFileDownloadUrl = await cloudStorage.generateSignedUrl(
                modelFilePath
              );
            }

            if(getTasks){
            
            const tasks  = await Model.find({ aiAssistedLabellingId :aiAssistantLabelling._id});
            const taskNames = tasks.map((task) => task.name || "");
            if (tasks.length) {
              updatedAiAssistantLabelling.taskNames = taskNames;
            }
          }
          
            return updatedAiAssistantLabelling;
          }));

       
      return res.status(200).json({aiAssistantLabellings: updatedAiAssitantLabellingdata})
    } catch(error) {
      console.log(error)
        logger.error("error~getAllAutomatedAiAssistantLabellings", error)
        return res.status(500).json({error: error.message})
    }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.updateAutomatedAiAssistantLabellings = async (req, res) => {
  try {

      const ids = copyByValue(req.body?.ids) || [];
      delete req.body.ids;

      const updateObject = {
        "$set": {...req.body}
      }
            
      if(req.body?.name) {
        updateObject["$set"]["name"]=req.body.name
      }

      if(req.body?.description) {
        updateObject["$set"]["description"]=req.body.description
      }

      if(req.body?.isUsingRLEFProjectGCP) {
        updateObject["$set"]["isUsingRLEFProjectGCP"]=req.body.isUsingRLEFProjectGCP
      }

      if(req.body?.userDeploymentPlatformChoice) {
        updateObject["$set"]["userDeploymentPlatformChoice"]=req.body.userDeploymentPlatformChoice.toLowerCase()
      }

      if(req.body?.deploymentLocation) {
        updateObject["$set"]["deploymentLocation"]=req.body.deploymentLocation.toLowerCase()
      }

      if(req.body?.computivePower) {
        updateObject["$set"]["computivePower"]=req.body.computivePower.toLowerCase()
      }
      
      if (!isNullOrUndefined(req.body.isTestingCodeByExecutingIt)) {
        updateObject["$set"]["dataMapping.isTestingCodeByExecutingIt"]=copyByValue(req.body.isTestingCodeByExecutingIt);
        delete req.body.isTestingCodeByExecutingIt;
        delete updateObject["$set"].isTestingCodeByExecutingIt;
      }

      if (!isNullOrUndefined(req.body.isFetchingCode)) {
        updateObject["$set"]["dataMapping.isFetchingCode"]=copyByValue(req.body.isFetchingCode);
        delete req.body.isFetchingCode;
        delete updateObject["$set"].isFetchingCode;
      }

      if (!isNullOrUndefined(req.body.code)) {
        updateObject["$set"]["dataMapping.code"]=copyByValue(req.body.code);
        delete req.body.code;
        delete updateObject["$set"].code;
      }

      if (req.body.resourceDataUpdatedBylabellingCode) {
        updateObject["$set"]["dataMapping.resourceDataUpdatedBylabellingCode"]=copyByValue(req.body.resourceDataUpdatedBylabellingCode);
        delete req.body.resourceDataUpdatedBylabellingCode;
        delete updateObject["$set"].resourceDataUpdatedBylabellingCode;
      }

      if (!isNullOrUndefined(req.body.consoleOutput)) {
        updateObject["$set"]["dataMapping.consoleOutput"]=copyByValue(req.body.consoleOutput);
        delete req.body.consoleOutput;
        delete updateObject["$set"].consoleOutput;
      }
      
      if (req.body?.mappedResourceForTestingCodeOn) {
        updateObject["$set"]["mappedResourceForTestingCodeOn"]=convertStringIdToMongoDBObjectId(req.body.mappedResourceForTestingCodeOn)
      } else if (req.body?.mappedResourceForTestingCodeOn === null || req.body?.mappedResourceForTestingCodeOn === "") {
        updateObject["$set"]["mappedResourceForTestingCodeOn"]=null;
      }

      const user = await User.findOne({emailId: req.userEmail})
      if(req.userEmail&&user) {
        updateObject["$set"]["lastModifiedByUserId"]=user._id
      }

      if(req.body?.isUsingRLEFProjectGCP === true) {
        const doesUserWantsToUseGCPOfHisProject = (()=>{
  
          if (req.body?.isUsingRLEFProjectGCP) {
            return true;
          }
          return false;
        })();

        if (doesUserWantsToUseGCPOfHisProject) {  
          for(let aiAssistantLabellingId of ids) {
            await AiAssistantLabellingHelperService.saveUserGCPCredentialsJsonAsFileInGCSInAiAssistantLabelling(
              aiAssistantLabellingId);
          }
        }    
      }

      const filter = {}
      if(ids) {
        filter._id = {
          $in: ids
        }
      }

      logger.info('exports.updateAutomatedAiAssistantLabellings= ~ updateObject: '+ JSON.stringify(updateObject))
      console.log('console.log style exports.updateAutomatedAiAssistantLabellings= ~ updateObject:', updateObject)

      const result = await AutomatedAiAssistantLabelling.updateMany(filter,
        updateObject
      )
      return res.status(200).send(result)
  } catch(error) {
      logger.error("error~updateAutomatedAiAssistantLabellings", error)
      return res.status(400).json({error: error.message})
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.getAllUniqueNames = async (req, res) => {
  try {
      const projectId = req?.params?.projectId || "";

      const filter = {}
      if(projectId) {
        filter.projectId = projectId
      }

      const aiAssistantLabellings = await AutomatedAiAssistantLabelling
      .find({projectId: convertStringIdToMongoDBObjectId(projectId.toString())})

      const namesArray = aiAssistantLabellings.map((data) => {
        return data.name
      })

      return res.status(200).json({ names: namesArray })
  } catch(error) {
      logger.error("error~getAllUniqueNames", error)
      return res.status(400).json({error: error.message})
  }
};


/**
 * @param {Request} req
 * @param {Response} res
 */
exports.getUploadSignedUrl = async (req, res) => {
  try {
    /** @type {String} */
    const modelFileName = req.body?.modelFileName || ""

    const _id = req.body?.aiAssistantLabellingId || "";
    const { globalPackageFileName, librariesRequirementsFileName, gcsCredentialJsonFileName } = req.body;
    console.log("getUploadSignedURL", _id, globalPackageFileName, librariesRequirementsFileName);
    
    if (!_id) {
      return res.status(400).json({ error: "_id is required" });
    }

    const signedUrls = {};
    const updateFields = {};
    const user = await User.findOne({emailId: req.userEmail})
    if(user) {
      updateFields.lastModifiedByUserId=user._id
    }
    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(_id);
    console.log(aiAssistantLabelling , "aiAssitantLabelling");
    if (!aiAssistantLabelling) {
      return res.status(404).json({ error: "AI Assistant Labelling not found" });
    }
    console.log("notfound");
    
    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: aiAssistantLabelling.projectId.toString() });
    
    if (globalPackageFileName) {
      const globalPackageFilePath = getAiAssistantLabellingGlobalPackageFileName(aiAssistantLabelling.projectId, _id, globalPackageFileName);
      const globalPackageFileContentType = getFileContentType(globalPackageFileName) || "application/octet-stream";
      const globalPackageFileSignedUrl = await cloudStorage.generateSignedUrlForUpload(globalPackageFilePath, globalPackageFileContentType);
      updateFields.globalPackageFileName = globalPackageFileName;
      signedUrls.globalPackageFile = {
        signedUrl: globalPackageFileSignedUrl,
        contentType: globalPackageFileContentType
      };
    }
    
    if (librariesRequirementsFileName) {
      const librariesRequirementsFilePath = getAiAssistantLabellingLibrariesRequirementsFileName(aiAssistantLabelling.projectId, _id, librariesRequirementsFileName);
      const librariesRequirementsFileContentType = getFileContentType(librariesRequirementsFileName) || "application/octet-stream";
      const librariesRequirementsFileSignedUrl = await cloudStorage.generateSignedUrlForUpload(librariesRequirementsFilePath, librariesRequirementsFileContentType);
      updateFields.librariesRequirementsFileName = librariesRequirementsFileName;
      signedUrls.librariesRequirementsFile = {
        signedUrl: librariesRequirementsFileSignedUrl,
        contentType: librariesRequirementsFileContentType
      };
    }

    if (gcsCredentialJsonFileName) {
      const gcsCredentialJsonFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(aiAssistantLabelling.projectId, _id, gcsCredentialJsonFileName);
      const gcsCredentialJsonFileContentType = getFileContentType(gcsCredentialJsonFileName) || "application/octet-stream";
      const gcsCredentialJsonFileSignedUrl = await cloudStorage.generateSignedUrlForUpload(gcsCredentialJsonFilePath, gcsCredentialJsonFileContentType);
      updateFields.GCPCredentialsJsonFileName = gcsCredentialJsonFileName;
      signedUrls.gcsCredentialJsonFile = {
        signedUrl: gcsCredentialJsonFileSignedUrl,
        contentType: gcsCredentialJsonFileContentType
      };
    }

    if (modelFileName) {
      const modelFilePath = getAiAssistantModelFileName(aiAssistantLabelling.projectId, _id, modelFileName);
      const modelFileContentType = getFileContentType(modelFileName) || "application/octet-stream";
      const modelFileSignedUrl = await cloudStorage.generateSignedUrlForUpload(modelFilePath, modelFileContentType);
      updateFields.modelFileName = modelFileName;
      signedUrls.modelFile = {
        signedUrl: modelFileSignedUrl,
        contentType: modelFileContentType
      };
    }

   await AutomatedAiAssistantLabelling.findByIdAndUpdate(_id, updateFields);
    return res.status(200).json(signedUrls );
  } catch (error) {
    logger.error("error~getUploadSignedUrl", error);
    return res.status(400).json({ error: error.message });
  }
};

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.deployAiAssistantLabelling = async (req, res) => {
  try {
      /**
      * @typedef RequestBodyType
      * @property {string} aiAssistantLabellingId
      */

      /** @type {RequestBodyType} */
      const RequestBody = req.body;

      const aiAssistantLabellingId = RequestBody?.aiAssistantLabellingId

      if(!aiAssistantLabellingId) {
        throw new Error('AI Assistant Labelling Id is required');
      }
      const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(aiAssistantLabellingId)

      if(!aiAssistantLabelling) {
        throw new Error('Invalid AI Assistant Labelling Id');
      }

      const cloudStorage = new CloudStorage();
      await cloudStorage.init({ projectId: aiAssistantLabelling.projectId.toString() });

      const bucketName = cloudStorage.getBucketName()

      let globalPackageFileGcsPath= "";
      if (aiAssistantLabelling.globalPackageFileName) {
        globalPackageFileGcsPath = getAiAssistantLabellingGlobalPackageFileName(
          aiAssistantLabelling.projectId.toString(),
          aiAssistantLabellingId,
          aiAssistantLabelling.globalPackageFileName
        );
        globalPackageFileGcsPath = `${bucketName}/${globalPackageFileGcsPath}`;
        globalPackageFileGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(globalPackageFileGcsPath);
        logger.info('aiAssistantLabelling.deploy= ~ globalPackageFileGcsPath: '+ globalPackageFileGcsPath)
      } else {
        logger.info('aiAssistantLabelling.deploy= ~ globalPackageFileGcsPath: '+ "")
      }
  
      let libariesRequirementFilGcsPath=""
      if (aiAssistantLabelling.librariesRequirementsFileName) {
        libariesRequirementFilGcsPath = getAiAssistantLabellingLibrariesRequirementsFileName(
          aiAssistantLabelling.projectId.toString(),
          aiAssistantLabellingId,
          aiAssistantLabelling.librariesRequirementsFileName
        );
        console.log('aiAssistantLabelling.deploy= ~ cloudStorage.getBucketName():', bucketName)
        libariesRequirementFilGcsPath = `${bucketName}/${libariesRequirementFilGcsPath}`;
        libariesRequirementFilGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(libariesRequirementFilGcsPath);
        logger.info('aiAssistantLabelling.deploy= ~ libariesRequirementFilGcsPath: '+ libariesRequirementFilGcsPath)
      }

      let getGcpCredentialsJsonForDeploymentFilePath=""
      if (aiAssistantLabelling.GCPCredentialsJsonFileName) {
        getGcpCredentialsJsonForDeploymentFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(
          aiAssistantLabelling.projectId.toString(),
          aiAssistantLabellingId,
          aiAssistantLabelling.GCPCredentialsJsonFileName
        );
        console.log('aiAssistantLabelling.deploy= ~ cloudStorage.getBucketName():', bucketName)
        getGcpCredentialsJsonForDeploymentFilePath = `${bucketName}/${getGcpCredentialsJsonForDeploymentFilePath}`;
        getGcpCredentialsJsonForDeploymentFilePath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(getGcpCredentialsJsonForDeploymentFilePath);
        logger.info('aiAssistantLabelling.deploy= ~ GcpCredentialsJsonForDeploymentFilePath: '+ getGcpCredentialsJsonForDeploymentFilePath)
      }
  
      const payload = {
        "project_id": aiAssistantLabelling.projectId.toString(),
        "AI_assisted_labelling_ID": aiAssistantLabelling._id.toString(),
        "AI_assisted_labelling_name": aiAssistantLabelling.name,
        "session_id": aiAssistantLabelling._id.toString(),
        "purpose_labelling_id": aiAssistantLabelling._id.toString(),
        "current_task": AI_ASSISTANT_LABELLING_CURRENT_TASK,
        "debug": false,
        "deployment_location": aiAssistantLabelling.deploymentLocation,
        "deployment_type": aiAssistantLabelling.userDeploymentPlatformChoice,
        "deployment_size": aiAssistantLabelling.computivePower,
        "code": {
          "ai_assisted_labelling": aiAssistantLabelling.dataMapping?.code || ""
        },
        "files": {
          "global_packages_filepath": globalPackageFileGcsPath,
          "gcs_auth_service_acc_filepath": getGcpCredentialsJsonForDeploymentFilePath,
          "librariesRequirementsFileCloudPath": libariesRequirementFilGcsPath
        }
      };

      if (aiAssistantLabelling.modelFileName) {
        const cloudStorage = new CloudStorage();
        await cloudStorage.init({projectId: aiAssistantLabelling.projectId.toString()})
        
        let modelFileCloudPath = getAiAssistantModelFileName(
          aiAssistantLabelling.projectId.toString(),
          aiAssistantLabelling._id.toString(),
          aiAssistantLabelling.modelFileName
        );
  
        modelFileCloudPath = `${cloudStorage.getBucketName()}/${modelFileCloudPath}`;   
        modelFileCloudPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(modelFileCloudPath); 
        
        logger.info(`labelling deploy code modelFileCloudPath `+modelFileCloudPath)
  
        payload["files"]["path_to_weight_file"]=modelFileCloudPath
      }      

      console.log("testing user email:", req.userEmail, payload )
      await AutomatedAiAssistantLabelling.findByIdAndUpdate(aiAssistantLabellingId,
        {
          $set: {
            status: "deploying",
            deploymentCompletionEmailRecepients: [
              req.userEmail
            ],
          }
        }
      )

      logger.info('debug exports.deployAiAssistantLabelling= ~ payload: '+ JSON.stringify(payload))

      const url = `${config.ADD_NEW_MODEL_BACKEND_BASEURL}/deploy`;

      let apiResponse = await axios.post(url, payload)
      console.log("response:", apiResponse.data)
      return res.send(apiResponse.data);
  } catch(error) {
      logger.error("error~deployAiAssistantLabelling", error.response)
      return res.status(400).json({error: error.message})
  }
}



/**
 * @param {Request} req
 * @param {Response} res
 */

exports.deleteAutomatedAiAssistantLabelling = async (req, res) => {
  try {
    const id = req.query.aiAssistantLabellingId;
    const deleteGlobalPackageFile = req.query.deleteGlobalPackageFile === "true";
    const deleteLibrariesRequirementsFile = req.query.deleteLibrariesRequirementsFile === "true";
    const deleteGcsCredentialsJsonFile = req.query.deleteGcsCredentialsJsonFile === "true";
     /** @type {boolean} */
    const deleteModelFile = req.query.deleteModelFile === "true"
    console.log("Delete Labelling" , id, deleteGlobalPackageFile, deleteLibrariesRequirementsFile, deleteGcsCredentialsJsonFile);
    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(id);
    if (!aiAssistantLabelling) {
      return res.status(404).json({ error: "AI Assistant Labelling not found" });
    }

    const projectId = aiAssistantLabelling.projectId.toString();
    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: projectId });

    const updateObject = {};

    if (deleteGlobalPackageFile && aiAssistantLabelling.globalPackageFileName) {
      const globalPackageFilePath = getAiAssistantLabellingGlobalPackageFileName(projectId, id, aiAssistantLabelling.globalPackageFileName);
      await cloudStorage.deleteFile(globalPackageFilePath);
      updateObject.globalPackageFileName = null; 
    }

    if (deleteLibrariesRequirementsFile && aiAssistantLabelling.librariesRequirementsFileName) {
      const librariesRequirementsFilePath = getAiAssistantLabellingLibrariesRequirementsFileName(projectId, id, aiAssistantLabelling.librariesRequirementsFileName);
      await cloudStorage.deleteFile(librariesRequirementsFilePath);
      updateObject.librariesRequirementsFileName = null; 
    }

    if (deleteGcsCredentialsJsonFile && aiAssistantLabelling.GCPCredentialsJsonFileName) {
      const gcsCredentialsJsonFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(projectId, id, aiAssistantLabelling.GCPCredentialsJsonFileName);
      await cloudStorage.deleteFile(gcsCredentialsJsonFilePath);
      updateObject.GCPCredentialsJsonFileName = null; 
    }

    if (deleteModelFile && aiAssistantLabelling.modelFileName) {
      const modelFilePath = getAiAssistantModelFileName(projectId, id, aiAssistantLabelling.modelFileName);
      await cloudStorage.deleteFile(modelFilePath);
      updateObject.modelFileName = null; 

    }

    await AutomatedAiAssistantLabelling.findByIdAndUpdate(id, updateObject);
    return res.status(200).json({ message: "AI Assistant Labelling file names deleted successfully" });
  } catch (error) {
    logger.error("error~deleteAutomatedAiAssistantLabelling", error);
    return res.status(400).json({ error: error.message });
  }
};

/**
 * @param {Request} req
 * @param {Response} res
 */
exports.getUniqueAssistantLabellingNames = async (req, res) => {
  try {
    const labellingName = req.query.labellingName;

    const aiAssistantLabellings = await AutomatedAiAssistantLabelling.findOne({
      name: labellingName
    });

    if (aiAssistantLabellings) {
      return res.status(200).json({ isUniqueAiAssistantName: false });
    } else {
      return res.status(200).json({ isUniqueAiAssistantName: true });

    }
  } catch (error) {
    logger.error("error~getUniqueAssistantLabellingNames", error);
    return res.status(400).json({ error: error.message });
  }
};
/**
 * @param {Request} req
 * @param {Response} res
 * @param {import("express").NextFunction} next
 */
exports.generateCode = async (req, res, next) => {
  try {
    /**
     * @typedef RequestQueryParamsType
     * @property {string} purpose_labelling_id
     */

    /** @type {RequestQueryParamsType} */
    // @ts-ignore
    const RequestQueryParams = req.query;
    logger.info('aiAssistantLabelling exports.generateCode= ~ RequestQueryParams: '+ JSON.stringify(RequestQueryParams || {}));

    const generateCodeApiRequestUrl = `${ADD_NEW_MODEL_BACKEND_BASEURL}/code`;
    console.log('aiAssistantLabelling exports.generateCode= ~ generateCodeApiRequestUrl: '+ generateCodeApiRequestUrl)

    const generateCodeApiRequestPayload = {
      purpose_labelling_id: RequestQueryParams.purpose_labelling_id,
      session_id: RequestQueryParams.purpose_labelling_id,
      current_task: "AIAssistedLabelling",
      debug: false
    }
    logger.info('aiAssistantLabelling exports.generateCode= ~ generateCodeApiRequestPayload: '+ JSON.stringify(generateCodeApiRequestPayload));

    // @ts-ignore
    const generateCodeApiResponse = await axios.post(generateCodeApiRequestUrl, generateCodeApiRequestPayload).catch(error=>{
      logger.error('aiAssistantLabelling exports.generateCode= ~ generateCodeApiResponse error: '+ JSON.stringify(error || {}))
    })
    logger.info('aiAssistantLabelling exports.generateCode= ~ generateCodeApiResponse data: '+ JSON.stringify(generateCodeApiResponse?.data || {}))

    res.send(generateCodeApiResponse.data);
  } catch (error) {
    next(error);
  }
}


/**
 * @param {Request} req
 * @param {Response} res
 */


exports.copyAiAssistantLabellingData = async (req, res) => {
  try {
    const { SourceAiAssistantLabellingId, DestinationAiAssistantLabellingId } = req.body;

    /**  @type {aiAssistantLabelling} */
    const dataToCopy = await AutomatedAiAssistantLabelling.findById(SourceAiAssistantLabellingId);

    /**  @type {aiAssistantLabelling} */
    const currentLabelling = await AutomatedAiAssistantLabelling.findById(DestinationAiAssistantLabellingId);
    
   
    if (dataToCopy) {
      const cloudStorage = new CloudStorage();
      await cloudStorage.init({ projectId: dataToCopy.projectId });
      
    if(dataToCopy.globalPackageFileName)
      {
      let globalPackagefilePathSource = getAiAssistantLabellingGlobalPackageFileName(dataToCopy.projectId, dataToCopy._id,dataToCopy.globalPackageFileName)
      let globalPackagefilePathDestination = getAiAssistantLabellingGlobalPackageFileName(currentLabelling.projectId,DestinationAiAssistantLabellingId,dataToCopy.globalPackageFileName)

      try {
       
        await cloudStorage.copy(globalPackagefilePathSource,globalPackagefilePathDestination)
      }
      catch (error) {
        console.log(error);
      }
    }
    

    if (dataToCopy.librariesRequirementsFileName) {
      const librariesRequirementFileSourceCloudPath = getAiAssistantLabellingLibrariesRequirementsFileName(dataToCopy.projectId, dataToCopy._id, dataToCopy.librariesRequirementsFileName);
      const librariesRequirementFileDestinationCloudPath = getAiAssistantLabellingLibrariesRequirementsFileName(currentLabelling.projectId, DestinationAiAssistantLabellingId, dataToCopy.librariesRequirementsFileName);

      try {
        await cloudStorage.copy(librariesRequirementFileSourceCloudPath, librariesRequirementFileDestinationCloudPath);
      }
      catch (error) {
        console.log(error);
      }      
    }
    const dataMappingObject = dataToCopy.dataMapping;
    dataMappingObject["isFetchingCode"]=false;
    dataMappingObject["isTestingCodeByExecutingIt"]=false;

    
  const copydata = {
    description : dataToCopy.description || "",
    mappedResourcesForTestingCodeOn :  dataToCopy.mappedResourcesForTestingCodeOn,
    savedForLaterResourcesOnWhichCodeCanBetestedOn:dataToCopy.savedForLaterResourcesOnWhichCodeCanBetestedOn,
    dataMapping : dataMappingObject,
    globalPackageFileName  :  dataToCopy.globalPackageFileName || "",
    librariesRequirementsFileName :  dataToCopy.librariesRequirementsFileName || "",
    }
 
  const updateAiAssistantLabelling = await AutomatedAiAssistantLabelling.findByIdAndUpdate(DestinationAiAssistantLabellingId
    , copydata, 
    { new: true });

    if (updateAiAssistantLabelling) {
      res.status(200).json(updateAiAssistantLabelling);
    } else {
        res.status(404).send('Destination AIAssitant Labelling not found');
    }

  }else{
    res.status(404).send('Source AiAssistant Labelling not found');
  }

}catch (error) {
  logger.error("error~CopyAssistantLabellingData", error);
  return res.status(400).json({ error: error.message });

  }
};


/**
 * @param {Request} req
 * @param {Response} res
 */

exports.deleteAutomatedAiAssistantLabellingfromDBandGCS = async (req, res) => {
  try {
    const id = req.query.aiAssistantLabellingId;

    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(id);
    if (!aiAssistantLabelling) {
      return res.status(404).json({ error: "AI Assistant Labelling not found" });
    }

    const projectId = aiAssistantLabelling.projectId.toString();

    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: projectId });
    const bucketName = cloudStorage.getBucketName();

    let getGcpCredentialsJsonForDeploymentFilePath = (() => {
      if (!aiAssistantLabelling?.GCPCredentialsJsonFileName) {
        return "";
      }
      return `gs://${bucketName}/${getAiAssistantGcpCredentialsJsonForDeploymentFileName(
        projectId, id, aiAssistantLabelling?.GCPCredentialsJsonFileName
      )}`
    })();

    logger.info(`deletion of AI assistant Labelling is going on by user having email id ${req.userEmail}`)

    await aiAssistantLabelling.updateOne({
        $set: {
          status: "deleting",
          deploymentCompletionEmailRecepients: [
            req.userEmail
          ],
          deploymentCompletionEmailCCRecepients: []
        }
      })

    const reqPayload = {
    "project_id": projectId.toString(),
    "AI_assisted_labelling_name": aiAssistantLabelling.name,
    "session_id": id?.toString(),
    "purpose_labelling_id": id?.toString(),
    "current_task": "AIAssistedLabelling",
    "deployment_location": aiAssistantLabelling.deploymentLocation,
    "files": {
        "gcs_auth_service_acc_filepath": getGcpCredentialsJsonForDeploymentFilePath
    },
    "operationOnDeployedPod":"delete"

    };
    
    
    // const url = "https://qa-rlef-training-pod-generation-backend-exjsxe2nda-uc.a.run.app/start_stop_delete_pod_from_cloud";
    const url = `${ADD_NEW_MODEL_BACKEND_BASEURL}/start_stop_delete_pod_from_cloud`;
    // let status=200;
    if(aiAssistantLabelling.status !== "draft"){
      
      const apiResponse = await axios.post(url, reqPayload);
      
      // status = apiResponse.status;

    }
   
    let folderpath = "";
      // if(status === 200){
    
    folderpath = getAiAssistantLabellingFolderPath(projectId, id);
    await cloudStorage.deleteResourceDirectory(folderpath);
      

    await AutomatedAiAssistantLabelling.findByIdAndDelete(id);
    return res.status(200).json({ message: "AI Assistant Labelling Deleted Sucessfully" });
  // }else{
  //   return res.status(400).json({message : "Error occured while deleteing AIAssistnat Labelling "});
  // }

    
  } catch (error) {
    console.log(error)
    logger.error("error~deleteAutomatedAiAssistantLabellingfromdbandgcs", error);
    return res.status(400).json({ error: error.message });
  }
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {import("express").NextFunction} next
 */
exports.testCode = async (req, res, next) => {
  try {
    /**
     * @typedef RequestBodyType
     * @property {string} aiAssistedLabellingId
     * @property {string} codeToTest
     */

    /** @type {RequestBodyType} */
    const RequestBody = req.body;

    logger.info('aiAssistedLabelling exports.testCode= ~ RequestBody: '+ JSON.stringify(RequestBody || {}))

    if (!RequestBody.aiAssistedLabellingId) {
      return res.status(400).send("aiAssistedLabellingId not found");
    }

    const aiAssistedLabelling = await AutomatedAiAssistantLabelling.findById(RequestBody.aiAssistedLabellingId);
    
    /** @type {Resource | null} */
    let selectedResource = null;

    if (aiAssistedLabelling?.mappedResourceForTestingCodeOn) {
      selectedResource = await Resource.findById(aiAssistedLabelling?.mappedResourceForTestingCodeOn).lean()
    }

    /** @type {IModel | null} */
    let selectedResourceModel = null;

    if (selectedResource) {
      selectedResourceModel = await Model.findById(selectedResource.model).lean();
    }

    if (!aiAssistedLabelling) {
      return res.status(400).send("aiAssistedLabelling not found");
    }

    const testCodeApiRequestFormData = new FormData();

    const cloudStorage = new CloudStorage();
    await cloudStorage.init({projectId: aiAssistedLabelling.projectId.toString()})

    testCodeApiRequestFormData.append("session_id", RequestBody.aiAssistedLabellingId);
    testCodeApiRequestFormData.append("current_task", "AIAssistedLabelling");

    if (aiAssistedLabelling.globalPackageFileName) {
      let globalPackageFileGcsPath = getAiAssistantLabellingGlobalPackageFileName(
        aiAssistedLabelling.projectId.toString(),
        RequestBody.aiAssistedLabellingId,
        aiAssistedLabelling.globalPackageFileName
      );
      globalPackageFileGcsPath = `${cloudStorage.getBucketName()}/${globalPackageFileGcsPath}`;
      globalPackageFileGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(globalPackageFileGcsPath);
      logger.info('labelling exports.testCode= ~ globalPackageFileGcsPath: '+ globalPackageFileGcsPath)
      
      testCodeApiRequestFormData.append("global_packages_filepath", globalPackageFileGcsPath);
    } else {
      logger.info('labelling exports.testCode= ~ globalPackageFileGcsPath: '+ "")
      // testCodeApiRequestFormData.append("global_packages_filepath", "");
    }

    if (aiAssistedLabelling.librariesRequirementsFileName) {

      const cloudStorage = new CloudStorage();
      await cloudStorage.init({projectId: aiAssistedLabelling.projectId.toString()})

      let libariesRequirementFilGcsPath = getAiAssistantLabellingLibrariesRequirementsFileName(
        aiAssistedLabelling.projectId.toString(),
        RequestBody.aiAssistedLabellingId,
        aiAssistedLabelling.librariesRequirementsFileName
      );

      console.log('exports.testCode= ~ cloudStorage.getBucketName():', cloudStorage.getBucketName())
      libariesRequirementFilGcsPath = `${cloudStorage.getBucketName()}/${libariesRequirementFilGcsPath}`;
      libariesRequirementFilGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(libariesRequirementFilGcsPath);
      
      logger.info('labelling exports.testCode= ~ libariesRequirementFilGcsPath: '+ libariesRequirementFilGcsPath)

      testCodeApiRequestFormData.append("librariesRequirementsFileCloudPath", libariesRequirementFilGcsPath);      
    }

    if (aiAssistedLabelling.modelFileName) {
      const cloudStorage = new CloudStorage();
      await cloudStorage.init({projectId: aiAssistedLabelling.projectId.toString()})
      
      let modelFileCloudPath = getAiAssistantModelFileName(
        aiAssistedLabelling.projectId.toString(),
        aiAssistedLabelling._id.toString(),
        aiAssistedLabelling.modelFileName
      );

      modelFileCloudPath = `${cloudStorage.getBucketName()}/${modelFileCloudPath}`;   
      modelFileCloudPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(modelFileCloudPath); 
      
        logger.info(`labelling test code modelFileCloudPath `+modelFileCloudPath)

      testCodeApiRequestFormData.append("path_to_weight_file", modelFileCloudPath);      
    }
    
    testCodeApiRequestFormData.append("code", RequestBody.codeToTest || "");      


    testCodeApiRequestFormData.append("purpose_labelling_id", RequestBody.aiAssistedLabellingId);
    testCodeApiRequestFormData.append("debug", "false");
    testCodeApiRequestFormData.append("status", RESOURCE_STATUS_PENDING);

    if (selectedResource?.csv) {
      testCodeApiRequestFormData.append("csv", selectedResource?.csv);
    }
    
    if (selectedResource?.model) {
      testCodeApiRequestFormData.append("model", selectedResource?.model.toString());
    }

    if (selectedResource?.label) {
      testCodeApiRequestFormData.append("label", selectedResource?.label);
    }

    if (selectedResource?.tag) {
      testCodeApiRequestFormData.append("tag", selectedResource?.tag);
    }
    
    if (!isNullOrUndefined(selectedResource?.confidence_score)) {
      testCodeApiRequestFormData.append("confidence_score", String(selectedResource?.confidence_score));
    }

    if (!isNullOrUndefined(selectedResource?.dataBoost)) {
      testCodeApiRequestFormData.append("dataBoost", String(selectedResource?.dataBoost));
    }

    if (selectedResource?.prediction) {
      testCodeApiRequestFormData.append("prediction", selectedResource?.prediction);
    }

    if (selectedResource?.parentResourceId) {
      testCodeApiRequestFormData.append("parentResourceId", selectedResource?.parentResourceId);
    }    

    if (selectedResource?.remarks) {
      testCodeApiRequestFormData.append("remarks", JSON.stringify(selectedResource?.remarks));
    }    

    if (selectedResource?.prompt) {
      testCodeApiRequestFormData.append("prompt", selectedResource?.prompt);
    }    

    if (selectedResource?.textOne) {
      testCodeApiRequestFormData.append("textOne", selectedResource?.textOne);
    }    

    if (selectedResource?.textTwo) {
      testCodeApiRequestFormData.append("textTwo", selectedResource?.textTwo);
    }    
    
    if (selectedResource?.trimmedFromAudioResource) {
      testCodeApiRequestFormData.append('trimmedFromAudioResource', JSON.stringify(selectedResource.trimmedFromAudioResource));
    }

    if (selectedResource?.trimmedAudios) {
      testCodeApiRequestFormData.append('trimmedAudios', JSON.stringify(selectedResource.trimmedAudios));
    }

    if (selectedResource?.trimmedTexts) {
      testCodeApiRequestFormData.append('trimmedTexts', JSON.stringify(selectedResource.trimmedTexts));
    }

    if (selectedResource?.trimmedFromTextResource) {
      testCodeApiRequestFormData.append('trimmedFromTextResource', JSON.stringify(selectedResource.trimmedFromTextResource));
    }

    if (selectedResource?.imageAnnotations) {
      testCodeApiRequestFormData.append('imageAnnotations', JSON.stringify(selectedResource.imageAnnotations));
    }

    if (selectedResource?.videoAnnotations) {
      testCodeApiRequestFormData.append('videoAnnotations', JSON.stringify(selectedResource.videoAnnotations));
    }

    if (selectedResource?.imageGroupAnnotations) {
      testCodeApiRequestFormData.append('imageGroupAnnotations', JSON.stringify(selectedResource.imageGroupAnnotations));
    }

    if (MODEL_TYPES_THAT_DONOT_REQUIRE_RESOURCE_FILE.includes(selectedResourceModel?.type || "")) {
      if (selectedResource?.resource) {
        testCodeApiRequestFormData.append("resource", selectedResource?.resource);
      }
    } else {
      if (selectedResource?.resource) {
        const resourceCloudStorage = new CloudStorage();
        await resourceCloudStorage.init({projectId: selectedResourceModel?.project.toString() || ""})

        const resourceBufferData = await resourceCloudStorage.getFileBufferData(
          getResourceStorageFileName(
              selectedResourceModel?.project || "",
              selectedResourceModel?._id.toString(),
              selectedResource._id.toString(),
              selectedResource.resource
          )
        );
          
        console.log('exports.testCode= ~ resourceBufferData:', resourceBufferData)
          if (resourceBufferData) {
            testCodeApiRequestFormData.append('resource', resourceBufferData, selectedResource.resource);          
          }
      }
    }    

    if (aiAssistedLabelling.dataMapping) {
      aiAssistedLabelling.dataMapping.isTestingCodeByExecutingIt = true;
      aiAssistedLabelling.dataMapping.code = RequestBody.codeToTest;

      await AutomatedAiAssistantLabelling.findByIdAndUpdate(RequestBody.aiAssistedLabellingId, {
        $set: {
          "dataMapping.isTestingCodeByExecutingIt": true,
          "dataMapping.code": RequestBody.codeToTest
        }
      })      

    }

    let testCodeApiResponse;
    try {
      testCodeApiResponse = await axios.post(
        `${ADD_NEW_MODEL_BACKEND_BASEURL}/test`, 
        testCodeApiRequestFormData,
        {
          headers: testCodeApiRequestFormData.getHeaders(),
          data: testCodeApiRequestFormData,
          maxContentLength: Infinity,
          maxBodyLength: Infinity        
        }
      )
    } catch (e) {
      const errorMessage = (e?.response?.data ? JSON.stringify(e?.response?.data) : e?.message) || "";
      logger.error(`aiAssisted labelling python code test api error: `+errorMessage);

      const updateResponse = await AutomatedAiAssistantLabelling.findByIdAndUpdate(RequestBody.aiAssistedLabellingId, {
        $set: {
          "dataMapping.isTestingCodeByExecutingIt": false,
          "dataMapping.consoleOutput": errorMessage,
          "dataMapping.resourceDataUpdatedBylabellingCode": null
        }
      })      
      console.log('exports.testCode= ~ updateResponse:', updateResponse)

      return res.send({
        status: "failed",
        consoleOutput: errorMessage,
        userUpdatedResponseJSON: null
      })
    }


    logger.info('exports.testCode= ~ testCodeApiResponse?.data: '+JSON.stringify(testCodeApiResponse?.data))
      await AutomatedAiAssistantLabelling.findByIdAndUpdate(RequestBody.aiAssistedLabellingId, {
        $set: {
          "dataMapping.isTestingCodeByExecutingIt": false,
          "dataMapping.consoleOutput": testCodeApiResponse?.data?.consoleOutput,
          "dataMapping.resourceDataUpdatedBylabellingCode": testCodeApiResponse?.data?.userUpdatedResponseJSON || null
        }
      })
      // @ts-ignore
      // aiAssistedLabelling.dataMapping.resourceDataUpdatedBylabellingCode = testCodeApiResponse.data.userUpdatedResponseJSON;


    // @ts-ignore
    res.send(testCodeApiResponse.data);

  } catch (error) {
    next(error);
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.updateCloudStatus = async (req, res) => {
  try {
      /**
      * @typedef RequestBodyType
      * @property {string} _id
      * @property {string} status
      * @property {string} errorMessage
      * @property {string} ipAddressIfDeploymentSuccess
      * @property {string} deployedConsoleUrl
      * @property {string} aiAssistantLabellingURL
      */

      /** @type {RequestBodyType} */
      const RequestBody = req.body;

      const { _id, status, errorMessage, ipAddressIfDeploymentSuccess, deployedConsoleUrl, aiAssistantLabellingURL } = RequestBody;
      logger.info('exports.updateDeploymentStatus= ~ req.body: '+ JSON.stringify(req.body || {}))
    
      if (!_id || !status)
        return res.status(400).json({ error: "Incomplete request body" });
      const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(_id);
  
      if (!aiAssistantLabelling)
        return res.status(400).json({ error: "Invalid AI Assistant Labelling ID" });
  
      if(status === "resumed") {
        aiAssistantLabelling.status = "deployed"
      } else {
        aiAssistantLabelling.status = status;
      }
  
      aiAssistantLabelling.errorMessage = errorMessage || '';
      aiAssistantLabelling.ipAddressIfDeploymentSuccess = ipAddressIfDeploymentSuccess || '';
      if(aiAssistantLabellingURL) {
        aiAssistantLabelling.aiAssistantLabellingURL = aiAssistantLabellingURL;
      }
  
      if (deployedConsoleUrl) {
        aiAssistantLabelling.deployedConsoleUrl = deployedConsoleUrl;
      } else {
        aiAssistantLabelling.deployedConsoleUrl = "";
      }
      
      const deploymentCompletionEmailRecepients = aiAssistantLabelling.deploymentCompletionEmailRecepients || [];
      const deploymentCompletionEmailCCRecepients = aiAssistantLabelling.deploymentCompletionEmailCCRecepients || [];
      await aiAssistantLabelling.save();
  
      if (status !== "deploying" && (deploymentCompletionEmailRecepients.length > 0 || deploymentCompletionEmailCCRecepients.length > 0)) {
        const projectID = aiAssistantLabelling.projectId;
        const projectModel = await Project.findById(projectID);
        const projectName = projectModel.name;
        const aiAssistantLabellingName = aiAssistantLabelling.name;
  
        if (status ===  "deleted") {
          await AutomatedAiAssistantLabelling.findByIdAndDelete(_id);
        }
    
        const apiResponse = await sendMailToUserForAiAssistantLabellingStatus(status, aiAssistantLabellingName, deploymentCompletionEmailRecepients, projectName, errorMessage);
       
        if (apiResponse) {
          return res.status(200).json({ message: "Status updated and email sent" });
        } else {
          return res.status(500).json({ error: "Status updated and email not sent" });
        }
      }
    
      return res.status(200).json({ message: "Status updated" });  
  } catch (error) {
    logger.error(`Status update failed, Error: ${error}`)
    return res.status(200).json({ message: "Status updated failed" });  
  }
}




/**
 * @param {Request} req
 * @param {Response} res
 */
exports.uploadUserCodeBase = async(req, res)=>{
  try{
     /** @type {String} */
    const _id = req.body.aiAssistantLabellingId;
    
    /** @type {String} */
    const userCodeBaseFileName = req.body.userCodeBaseFileName;

    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(_id);

    if (!_id) {
      return res.status(400).json({ error: "aiAssistantLabellingId is required" });
    }

    if (!aiAssistantLabelling) {
      return res.status(404).json({ error: "AutomatedAiAssistantLabelling not found" });
    }

    if(!userCodeBaseFileName){
      return res.status(400).json({ error: "userCodeBaseFileName is required" })

    }

    const projectId = aiAssistantLabelling.projectId.toString();
    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: projectId }); 


    const userCodeBaseFilepath = getAiAssistantLabellingUserCodeBaseFilepath(projectId, _id, userCodeBaseFileName);
    const userCodeBaseFileContentType = getFileContentType(userCodeBaseFileName);
    const userCodeBaseFolderSignedURL = await cloudStorage.generateSignedUrlForUpload(userCodeBaseFilepath, userCodeBaseFileContentType);

    await AutomatedAiAssistantLabelling.findByIdAndUpdate(_id, { userCodeFileName: userCodeBaseFileName });
    
    return res.status(200).json({ 
      fileUploadURL: userCodeBaseFolderSignedURL, 
      fileContentType: userCodeBaseFileContentType 
    });
    

  } catch(error){
    console.error("error~uploadUserCodeBasefileupload", error);
    return res.status(400).json({ error: error.message });
  }
};



/**
 * @param {Request} req
 * @param {Response} res
 */
exports.downloadUserCodeBase = async(req, res)=>{
  try{
    /** @type {String} */
    const _id = req.body.aiAssistantLabellingId;

    

    /** @type {String} */
    const code = req.body.code;

    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(_id);
    

    if (!_id) {
      return res.status(400).json({ error: "aiAssistantLabellingId is required" });
    }

    if (!aiAssistantLabelling) {
      return res.status(404).json({ error: "AutomatedAiAssistantLabelling not found" });
    }

    // if(!aiAssistantLabelling.userCodeFileName){
    //   return res.status(400).json({ error: "userCodeBaseFile not found" })
    // }
      /** @type {Resource | null} */
    let dataMapping = null;

    if (aiAssistantLabelling?.mappedResourceForTestingCodeOn) {
        dataMapping  = await Resource.find({ _id :aiAssistantLabelling.mappedResourceForTestingCodeOn}).lean();
      }

    if(!dataMapping){
      return res.status(400).json({ error: "dataMapping not found" })
    }
   
  
    
    if(aiAssistantLabelling.dataMapping.code && aiAssistantLabelling.dataMapping.code !== code){

      await aiAssistantLabelling.updateOne({ $set: {
        "dataMapping.code": code
      } });

    }

    let selectedResourceModel = null;

    if (dataMapping?.[0]) {
      selectedResourceModel = await Model.findById(dataMapping?.[0]?.model).lean();
    }

   const projectId = aiAssistantLabelling.projectId.toString();

   
    
    const downloadUserCodeFormData = new FormData();


    if (aiAssistantLabelling.globalPackageFileName) {
      let globalPackageFileGcsPath = getAiAssistantLabellingGlobalPackageFileName(
        aiAssistantLabelling.projectId.toString(),
        aiAssistantLabelling._id,
        aiAssistantLabelling.globalPackageFileName
      );
      const cloudStorage = new CloudStorage();
      await cloudStorage.init({projectId: aiAssistantLabelling.projectId.toString()})
      globalPackageFileGcsPath = `${cloudStorage.getBucketName()}/${globalPackageFileGcsPath}`;
      globalPackageFileGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(globalPackageFileGcsPath);
      logger.info('labelling exports.testCode= ~ globalPackageFileGcsPath: '+ globalPackageFileGcsPath)
      downloadUserCodeFormData.append("global_packages_filepath", globalPackageFileGcsPath);
    }

    if (aiAssistantLabelling.librariesRequirementsFileName) {

      const cloudStorage = new CloudStorage();
      await cloudStorage.init({projectId: aiAssistantLabelling.projectId.toString()})

      let libariesRequirementFilGcsPath = getAiAssistantLabellingLibrariesRequirementsFileName(
        aiAssistantLabelling.projectId.toString(),
        aiAssistantLabelling._id,
        aiAssistantLabelling.librariesRequirementsFileName
      );

      console.log('exports.testCode= ~ cloudStorage.getBucketName():', cloudStorage.getBucketName())
      libariesRequirementFilGcsPath = `${cloudStorage.getBucketName()}/${libariesRequirementFilGcsPath}`;
      libariesRequirementFilGcsPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(libariesRequirementFilGcsPath);
      
      logger.info('labelling exports.testCode= ~ libariesRequirementFilGcsPath: '+ libariesRequirementFilGcsPath)

      downloadUserCodeFormData.append("librariesRequirementsFileCloudPath", libariesRequirementFilGcsPath);      
    }

   
   
    if (dataMapping[0]?.csv) {
      downloadUserCodeFormData.append("csv", dataMapping[0]?.csv);
    }
    
    if (dataMapping[0]?.model) {
      downloadUserCodeFormData.append("model", dataMapping[0]?.model.toString());
    }

    if (dataMapping[0]?.label) {
      downloadUserCodeFormData.append("label", dataMapping[0]?.label);
    }

    if (dataMapping[0]?.tag) {
      downloadUserCodeFormData.append("tag", dataMapping[0]?.tag);
    }
    
    if (!isNullOrUndefined(dataMapping[0]?.confidence_score)) {
      downloadUserCodeFormData.append("confidence_score", String(dataMapping[0]?.confidence_score));
    }

    if (!isNullOrUndefined(dataMapping[0]?.dataBoost)) {
      downloadUserCodeFormData.append("dataBoost", String(dataMapping[0]?.dataBoost));
    }

    if (dataMapping[0]?.prediction) {
      downloadUserCodeFormData.append("prediction", dataMapping[0]?.prediction);
    }

    if (dataMapping[0]?.parentResourceId) {
      downloadUserCodeFormData.append("parentResourceId", dataMapping[0]?.parentResourceId);
    }    

    if (dataMapping[0]?.remarks) {
      downloadUserCodeFormData.append("remarks", JSON.stringify(dataMapping[0]?.remarks));
    }    

    if (dataMapping[0]?.prompt) {
      downloadUserCodeFormData.append("prompt", dataMapping[0]?.prompt);
    }    

    if (dataMapping[0]?.textOne) {
      downloadUserCodeFormData.append("textOne", dataMapping[0]?.textOne);
    }    

    if (dataMapping[0]?.textTwo) {
      downloadUserCodeFormData.append("textTwo", dataMapping[0]?.textTwo);
    }    
    
    if (dataMapping[0]?.trimmedFromAudioResource) {
      downloadUserCodeFormData.append('trimmedFromAudioResource', JSON.stringify(dataMapping[0].trimmedFromAudioResource));
    }

    if (dataMapping[0]?.trimmedAudios) {
      downloadUserCodeFormData.append('trimmedAudios', JSON.stringify(dataMapping[0].trimmedAudios));
    }

    if (dataMapping[0]?.trimmedTexts) {
      downloadUserCodeFormData.append('trimmedTexts', JSON.stringify(dataMapping[0].trimmedTexts));
    }

    if (dataMapping[0]?.trimmedFromTextResource) {
      downloadUserCodeFormData.append('trimmedFromTextResource', JSON.stringify(dataMapping[0].trimmedFromTextResource));
    }

    if (dataMapping[0]?.imageAnnotations) {
      downloadUserCodeFormData.append('imageAnnotations', JSON.stringify(dataMapping[0].imageAnnotations));
    }

    if (dataMapping[0]?.videoAnnotations) {
      downloadUserCodeFormData.append('videoAnnotations', JSON.stringify(dataMapping[0].videoAnnotations));
    }

    if (dataMapping[0]?.imageGroupAnnotations) {
      downloadUserCodeFormData.append('imageGroupAnnotations', JSON.stringify(dataMapping[0].imageGroupAnnotations));
    }

    if (MODEL_TYPES_THAT_DONOT_REQUIRE_RESOURCE_FILE.includes(selectedResourceModel?.type || "")) {
      if (dataMapping?.[0]?.resource) {
        downloadUserCodeFormData.append("resource", dataMapping?.[0]?.resource);
      }
    } else {
      if (dataMapping?.[0]?.resource) {
        const resourceCloudStorage = new CloudStorage();
        await resourceCloudStorage.init({projectId: selectedResourceModel?.project.toString() || ""})

        const resourceBufferData = await resourceCloudStorage.getFileBufferData(
          getResourceStorageFileName(
            selectedResourceModel?.project.toString(),
            dataMapping?.[0]?.model.toString(),
            dataMapping?.[0]._id.toString(),
            dataMapping?.[0].resource
          )
        );
          
        console.log('exports.testCode= ~ resourceBufferData:', resourceBufferData)
          if (resourceBufferData) {
            downloadUserCodeFormData.append('resource', resourceBufferData, dataMapping?.[0].resource);          
          }
      }
    }  


    downloadUserCodeFormData.append('session_id', _id);
    downloadUserCodeFormData.append('current_task', _id);
    downloadUserCodeFormData.append('purpose_labelling_id', _id);
    downloadUserCodeFormData.append('debug', "false");
    downloadUserCodeFormData.append('code', code);

    if (aiAssistantLabelling.modelFileName) {
      const cloudStorage = new CloudStorage();
      await cloudStorage.init({projectId: aiAssistantLabelling.projectId.toString()})
      
      let modelFileCloudPath = getAiAssistantModelFileName(
        aiAssistantLabelling.projectId.toString(),
        aiAssistantLabelling._id.toString(),
        aiAssistantLabelling.modelFileName
      );

      modelFileCloudPath = `${cloudStorage.getBucketName()}/${modelFileCloudPath}`;   
      modelFileCloudPath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(modelFileCloudPath); 
      
      logger.info(`labelling zip code modelFileCloudPath `+modelFileCloudPath)

      downloadUserCodeFormData.append("path_to_weight_file", modelFileCloudPath)
    }
   
  const url = `${config.ADD_NEW_MODEL_BACKEND_BASEURL}/zip_files`;

  const apiResponse = await axios.post(url, downloadUserCodeFormData, {
 
  headers: downloadUserCodeFormData.getHeaders(),
  data: downloadUserCodeFormData,
  maxContentLength: Infinity,
  maxBodyLength: Infinity    
});
console.log("apiResponse", apiResponse.data)

const latestLabelling = await AutomatedAiAssistantLabelling.findById(_id);
if(!latestLabelling) {
  return res.status(404).json({ error: "AutomatedAiAssistantLabelling not found" });
}
    const userCodeBaseZipFilepath = getAiAssistantLabellingUserCodeBaseFilepath(projectId, _id, latestLabelling.userCodeFileName);
    
    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: projectId });
    
    const userCodeBaseFolderZipSignedURL = await cloudStorage.generateSignedUrl(userCodeBaseZipFilepath);


    return res.status(200).json({ fileURL: userCodeBaseFolderZipSignedURL , fileName : aiAssistantLabelling.userCodeFileName   });


  }catch(error){
    console.log(error)
    console.error("error~downloadUserCodeBasefile", error);
    return res.status(400).json({ error: error.message });

  }
};

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.suspendAiAssistantLabelling = async (req, res) => {
  try {
    /** @type {String} */
    const aiAssistantLabellingId = req.params?.aiAssistantLabellingId
    if(!aiAssistantLabellingId) {
      throw new Error("aiAssistantLabellingId is required")
    }

    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(aiAssistantLabellingId)

    if(!aiAssistantLabelling) {
      throw new Error("aiAssistantLabellingId is invalid")
    }

    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: aiAssistantLabelling.projectId.toString() });
    const bucketName = cloudStorage.getBucketName();

    let getGcpCredentialsJsonForDeploymentFilePath=""
    if (aiAssistantLabelling.GCPCredentialsJsonFileName) {
      getGcpCredentialsJsonForDeploymentFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(
        aiAssistantLabelling.projectId.toString(),
        aiAssistantLabellingId,
        aiAssistantLabelling.GCPCredentialsJsonFileName
      );
      console.log('aiAssistantLabelling.deploy= ~ cloudStorage.getBucketName():', bucketName)
      getGcpCredentialsJsonForDeploymentFilePath = `${bucketName}/${getGcpCredentialsJsonForDeploymentFilePath}`;
      getGcpCredentialsJsonForDeploymentFilePath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(getGcpCredentialsJsonForDeploymentFilePath);
      logger.info('aiAssistantLabelling.deploy= ~ GcpCredentialsJsonForDeploymentFilePath: '+ getGcpCredentialsJsonForDeploymentFilePath)
    }

    const user = await User.findOne({emailId: req.userEmail})

    await AutomatedAiAssistantLabelling.findByIdAndUpdate(aiAssistantLabellingId,
    {
      $set: {
        status: "suspending",
        deploymentCompletionEmailRecepients: [
          req.userEmail
        ],
        lastModifiedByUserId: user._id
      }
    })

    const reqPayload = {
      project_id: aiAssistantLabelling.projectId.toString(),
      AI_assisted_labelling_name: aiAssistantLabelling.name,
      session_id: aiAssistantLabelling._id.toString(),
      purpose_labelling_id: aiAssistantLabelling._id.toString(),
      current_task: AI_ASSISTANT_LABELLING_CURRENT_TASK,
      deployment_location: aiAssistantLabelling.deploymentLocation,
      files: {
        gcs_auth_service_acc_filepath: getGcpCredentialsJsonForDeploymentFilePath
      },
      operationOnDeployedPod:"stop"
    }

    const url = `${config.ADD_NEW_MODEL_BACKEND_BASEURL}/start_stop_delete_pod_from_cloud`

    const apiResponse = await axios.post(url, reqPayload)

    console.log("testing stop", apiResponse)

    return res.status(apiResponse.status).json(apiResponse.data)
  } catch (error) {
    logger.error(`Error Occured while suspending AI Assistant Labelling: ${error}`)
    return res.status(400).json({ error: `Error Occured while suspending AI Assistant Labelling: ${error}`})
  }
}

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
exports.resumeAiAssistantLabelling = async (req, res) => {
  try {
    /** @type {String} */
    const aiAssistantLabellingId = req.params?.aiAssistantLabellingId
    if(!aiAssistantLabellingId) {
      throw new Error("aiAssistantLabellingId is required")
    }
    const aiAssistantLabelling = await AutomatedAiAssistantLabelling.findById(aiAssistantLabellingId)

    if(!aiAssistantLabelling) {
      throw new Error("aiAssistantLabellingId is invalid")
    }

    const cloudStorage = new CloudStorage();
    await cloudStorage.init({ projectId: aiAssistantLabelling.projectId.toString() });
    const bucketName = cloudStorage.getBucketName();



    let getGcpCredentialsJsonForDeploymentFilePath=""
    if (aiAssistantLabelling.GCPCredentialsJsonFileName) {
      getGcpCredentialsJsonForDeploymentFilePath = getAiAssistantGcpCredentialsJsonForDeploymentFileName(
        aiAssistantLabelling.projectId.toString(),
        aiAssistantLabellingId,
        aiAssistantLabelling.GCPCredentialsJsonFileName
      );
      console.log('aiAssistantLabelling.deploy= ~ cloudStorage.getBucketName():', bucketName)
      getGcpCredentialsJsonForDeploymentFilePath = `${bucketName}/${getGcpCredentialsJsonForDeploymentFilePath}`;
      getGcpCredentialsJsonForDeploymentFilePath = cloudStorage.applyCloudSpecificPrefixToCloudStorageFileNamePath(getGcpCredentialsJsonForDeploymentFilePath);
      logger.info('aiAssistantLabelling.deploy= ~ GcpCredentialsJsonForDeploymentFilePath: '+ getGcpCredentialsJsonForDeploymentFilePath)
    }
    const user = await User.findOne({emailId: req.userEmail})

    await AutomatedAiAssistantLabelling.findByIdAndUpdate(aiAssistantLabellingId,
      {
        $set: {
          status: "resuming",
          deploymentCompletionEmailRecepients: [
            req.userEmail
          ],
          lastModifiedByUserId: user._id
        }
      })

    const reqPayload = {
      project_id: aiAssistantLabelling.projectId.toString(),
      AI_assisted_labelling_name: aiAssistantLabelling.name,
      session_id: aiAssistantLabelling._id.toString(),
      purpose_labelling_id: aiAssistantLabelling._id.toString(),
      current_task: AI_ASSISTANT_LABELLING_CURRENT_TASK,
      deployment_location: aiAssistantLabelling.deploymentLocation,
      files: {
        gcs_auth_service_acc_filepath: getGcpCredentialsJsonForDeploymentFilePath
      },
      operationOnDeployedPod:"start"
    }

    const url = `${config.ADD_NEW_MODEL_BACKEND_BASEURL}/start_stop_delete_pod_from_cloud`

    const apiResponse = await axios.post(url, reqPayload)

    console.log("testing start", apiResponse)

    return res.status(apiResponse.status).json(apiResponse.data)
  } catch (error) {
    logger.error(`Error Occured while resuming AI Assistant Labelling: ${error}`)
    return res.status(400).json({ error: `Error Occured while resuming AI Assistant Labelling: ${error}`})
  }
}
