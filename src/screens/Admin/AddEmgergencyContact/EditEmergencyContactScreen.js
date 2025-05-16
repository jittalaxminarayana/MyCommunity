// EditEmergencyContactScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';

const EditEmergencyContactScreen = ({ route }) => {
    const { contactId } = route.params;
    const navigation = useNavigation();
    const communityData = useSelector((state) => state.user.communityData);
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    console.log("data@@@@@@", name, number, category,)

    useEffect(() => {
        const fetchContact = async () => {
            try {
                const doc = await firestore()
                    .collection('communities')
                    .doc(communityData.id)
                    .collection('emergencyContacts')
                    .doc(contactId)
                    .get();

                if (doc.exists) {
                    const data = doc.data();
                    console.log("data@@@@@@", data)
                    setName(data.name);
                    setNumber(data.number);
                    setCategory(data.category);
                }
            } catch (error) {
                console.error('Error fetching contact:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchContact();
    }, [contactId, communityData.id]);

    const handleUpdate = async () => {
        if (!name.trim() || !number.trim()) {
            alert('Please fill all fields');
            return;
        }

        setSaving(true);
        try {
            await firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('emergencyContacts')
                .doc(contactId)
                .update({
                    name,
                    number,
                    category,
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                });

            navigation.goBack();
        } catch (error) {
            console.error('Error updating contact:', error);
            alert('Failed to update contact');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete Contact',
            'Are you sure you want to delete this contact?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await firestore()
                                .collection('communities')
                                .doc(communityData.id)
                                .collection('emergencyContacts')
                                .doc(contactId)
                                .delete();

                            navigation.goBack();
                        } catch (error) {
                            console.error('Error deleting contact:', error);
                            alert('Failed to delete contact');
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#366732" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}> Edit Contact </Text>
            </View>

            <View style={styles.container}>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Contact Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="phone-pad"
                        value={number}
                        onChangeText={setNumber}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={category}
                            onValueChange={setCategory}
                            style={styles.picker}
                        >
                            <Picker.Item label="Medical" value="medical" />
                            <Picker.Item label="Fire" value="fire" />
                            <Picker.Item label="Police" value="police" />
                            <Picker.Item label="Plumbing" value="plumbing" />
                            <Picker.Item label="Electrical" value="electrical" />
                        </Picker>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleUpdate}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Update Contact</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                >
                    <Text style={styles.deleteButtonText}>Delete Contact</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        padding: 20,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        fontSize: 16,
        elevation: 2,
    },
    pickerContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    saveButton: {
        backgroundColor: '#366732',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    deleteButton: {
        backgroundColor: '#FF5252',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#366732',
        padding: 10,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
        marginRight:35
    },
    iconButton: {
        padding: 8,
    },
});

export default EditEmergencyContactScreen;