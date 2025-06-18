// AddEmergencyContactScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import firestore from '@react-native-firebase/firestore';
import { useSelector } from 'react-redux';

const AddEmergencyContactScreen = ({ route }) => {
    const navigation = useNavigation();
    const communityData = useSelector((state) => state.user.communityData);
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [category, setCategory] = useState('medical');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
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
                .add({
                    name,
                    number,
                    category,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                });

            navigation.goBack();
        } catch (error) {
            console.error('Error adding contact:', error);
            alert('Failed to add contact');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}> Add Contact </Text>
            </View>

            <View style={styles.container}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Contact Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Fire Department"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. +911012345678"
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
                            onValueChange={(itemValue) => setCategory(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Medical" value="edical" />
                            <Picker.Item label="Fire" value="fire" />
                            <Picker.Item label="Police" value="police" />
                            <Picker.Item label="Plumbing" value="plumbing" />
                            <Picker.Item label="Electrical" value="electrical" />
                        </Picker>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Contact</Text>
                    )}
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

export default AddEmergencyContactScreen;