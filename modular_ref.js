// Refactored code with improved readability and maintainability

// Function to extract chat data from an object
export function getChatData(chatObject) {
    // Create an array to store the chat data
    const chatData = [];

    // Iterate through the keys of the chatObject
    Object.keys(chatObject).forEach((key) => {
        // Push the relevant data to the chatData array
        chatData.push({
            id: chatObject[key].id,
            question: chatObject[key].question,
            response: chatObject[key].response,
            timestamp: chatObject[key].timestamp,
        });
    });

    // Return the array of chat data
    return chatData;
}

// Function to extract task chat data from an object
export function getTaskChatData(taskChatObject) {
    // Create an array to store the task chat data
    const taskChatData = [];

    // Iterate through the keys of the taskChatObject
    Object.keys(taskChatObject).forEach((key) => {
        // Push the relevant data to the taskChatData array
        taskChatData.push({
            id: taskChatObject[key].id,
            question: taskChatObject[key].question,
            response: taskChatObject[key].response,
            taskCreated: taskChatObject[key].taskCreated,
        });
    });

    // Return the array of task chat data
    return taskChatData;
}

// Function to extract the city name from a string
export function getCityFromString(str) {
    // Use a regular expression to match the city name enclosed in quotes
    const match = str.match(/"([^"]*)"/);
    // Return the matched city name or null if no match is found
    return match ? match[1] : null;
}

// Function to extract weather details from an object
export function getWeatherDetails(weatherObject) {
    // Create an array to store the weather details
    const weatherDetails = [];

    // Iterate through the keys of the weatherObject
    for (const key in weatherObject) {
        // Check if the value is not null and not 0
        if (weatherObject[key] && weatherObject[key] !== 0) {
            // Push the key-value pair to the weatherDetails array
            weatherDetails.push({
                key: key,
                value: weatherObject[key],
            });
        }
    }

    // Return the array of weather details
    return weatherDetails;
}
